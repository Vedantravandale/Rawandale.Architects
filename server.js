require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { StoreDatabase } = require("./database");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const PRIVATE_DIR = path.join(ROOT, "private-files");
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DIR, { recursive: true });
const defaultProducts = [
  {id:"ceiling-detail-pack",name:"Ceiling Construction Detail Pack",category:"PDF Construction Details",description:"A practical starter pack of ceiling junction and cove details for design coordination. Replace this sample with your own verified drawing set.",price:299,currency:"INR",fileName:null,active:true,featured:true},
  {id:"revit-family-starter",name:"Revit Family Starter Bundle",category:"Revit Families",description:"Parametric family bundle placeholder. Add your own RVT/RFA files from the admin panel.",price:499,currency:"INR",fileName:null,active:true,featured:true},
  {id:"cad-detail-library",name:"CAD Detail Library",category:"DWG Drawings",description:"DWG detail library placeholder for architectural documentation workflows.",price:399,currency:"INR",fileName:null,active:true,featured:false},
  {id:"architect-detail-ebook",name:"Architectural Details Ebook",category:"ZIP Bundles & Ebooks",description:"A compact reference ebook placeholder. Upload your own PDF or ZIP through admin.",price:199,currency:"INR",fileName:null,active:true,featured:false}
];
const database = new StoreDatabase(DATA_DIR);
const mailConfigured = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.INQUIRY_TO_EMAIL);
const sendInquiryEmail = async inquiry => {
  if (!mailConfigured()) return false;
  const transporter=nodemailer.createTransport({service:"gmail",auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_APP_PASSWORD.replace(/\s/g,"")}});
  const htmlEscape=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const name=htmlEscape(inquiry.name), email=htmlEscape(inquiry.email), phone=htmlEscape(inquiry.phone||"Not provided"), service=htmlEscape(inquiry.service), message=htmlEscape(inquiry.message).replace(/\n/g,"<br>");
  await transporter.sendMail({
    from:`Rawandale Architects <${process.env.GMAIL_USER}>`,
    to:process.env.INQUIRY_TO_EMAIL,
    replyTo:inquiry.email,
    subject:`New website enquiry · ${inquiry.name}`,
    text:`New project enquiry\n\nName: ${inquiry.name}\nEmail: ${inquiry.email}\nPhone: ${inquiry.phone||"Not provided"}\nProject type: ${inquiry.service}\n\n${inquiry.message}`,
    html:`<div style="font:15px/1.7 Arial,sans-serif;color:#20231f;max-width:640px;margin:auto"><p style="font-size:11px;letter-spacing:2px;color:#9b7951">RAWANDALE ARCHITECTS · WEBSITE ENQUIRY</p><h1 style="font:32px Georgia,serif">A new project enquiry</h1><p><b>${name}</b> is interested in <b>${service}</b>.</p><p><a href="mailto:${email}">${email}</a><br>${phone}</p><div style="padding:18px;background:#f5f4ef;white-space:normal">${message}</div><p style="font-size:12px;color:#696d66">Reply directly to this email to contact the enquirer.</p></div>`
  });
  return true;
};

const safeEqual = (a,b) => {
  const aa=Buffer.from(String(a||"")), bb=Buffer.from(String(b||""));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
};
const hasRazorpay = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET &&
  !process.env.RAZORPAY_KEY_ID.includes("replace") && !process.env.RAZORPAY_KEY_SECRET.includes("replace"));
const razorpay = () => {
  if (!hasRazorpay()) throw new Error("Razorpay test credentials are not configured. Copy .env.example to .env and add test keys.");
  return new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
};
const sessionCookie = "ra_admin";
const sessionHash = token => crypto.createHash("sha256").update(token).digest("hex");
const asyncRoute = handler => (req,res,next) => Promise.resolve(handler(req,res,next)).catch(next);
const isAdmin = async req => {
  const token=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+"="))?.split("=").slice(1).join("=");
  if(!token) return false;
  const session=await database.findSession(sessionHash(token));
  if(!session) return false;
  if(session.expires_at<=Date.now()) { await database.deleteSession(sessionHash(token)); return false; }
  return true;
};
const adminOnly = asyncRoute(async (req,res,next) => await isAdmin(req) ? next() : res.status(401).json({error:"Admin login required."}));
const cleanProduct = p => ({id:p.id,name:p.name,category:p.category,description:p.description,price:p.price,currency:p.currency||"INR",active:!!p.active,featured:!!p.featured,hasFile:!!p.fileName});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:false}));
app.use("/api", rateLimit({windowMs:60*1000,limit:120,standardHeaders:true,legacyHeaders:false}));
app.use(express.static(path.join(ROOT,"public")));
app.get("/api/config",(req,res)=>res.json({keyId:hasRazorpay()?process.env.RAZORPAY_KEY_ID:null,currency:process.env.CURRENCY||"INR",mode:hasRazorpay()?"razorpay-test-or-live-keys-configured":"demo-preview",liveReady:hasRazorpay()}));
app.get("/api/site-settings",asyncRoute(async (req,res)=>{
  const setting=await database.getSiteSetting("anime_display");
  res.setHeader("Cache-Control","no-store");
  res.json({animeDisplay:setting?.value==="true"});
}));
app.get("/api/products",asyncRoute(async (req,res)=>res.json((await database.listProducts(true)).map(cleanProduct))));
app.post("/api/inquiries",rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:true,legacyHeaders:false}),asyncRoute(async (req,res)=>{
  const body=req.body||{};
  if(String(body.website||"").trim()) return res.json({ok:true});
  const name=String(body.name||"").trim().slice(0,120);
  const email=String(body.email||"").trim().toLowerCase().slice(0,200);
  const phone=String(body.phone||"").trim().slice(0,40);
  const service=String(body.service||"").trim().slice(0,100);
  const message=String(body.message||"").trim().slice(0,4000);
  if(name.length<2) return res.status(400).json({error:"Please enter your name."});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:"Please enter a valid email address."});
  if(message.length<10) return res.status(400).json({error:"Please add a little more detail about your project."});
  const inquiry={id:crypto.randomUUID(),name,email,phone,service,message,createdAt:new Date().toISOString()};
  await database.createInquiry(inquiry);
  let emailSent=false;
  try { emailSent=await sendInquiryEmail(inquiry); }
  catch(error) { console.error("Gmail inquiry notification failed:",error.message); }
  res.status(201).json({ok:true,id:inquiry.id,emailSent});
}));
app.post("/api/admin/login",rateLimit({windowMs:15*60*1000,limit:10}), (req,res)=>{
  if(!process.env.ADMIN_PASSWORD || !safeEqual(req.body.password,process.env.ADMIN_PASSWORD)) return res.status(401).json({error:"Invalid password."});
  const token=crypto.randomBytes(32).toString("hex"), expiresAt=Date.now()+8*60*60*1000;
  database.saveSession(sessionHash(token),expiresAt).then(()=>{
    res.setHeader("Set-Cookie",`${sessionCookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
    res.json({ok:true});
  }).catch(()=>res.status(500).json({error:"Could not start admin session."}));
});
app.post("/api/admin/logout",adminOnly,asyncRoute(async (req,res)=>{
  const token=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+"="))?.split("=").slice(1).join("=");
  if(token) await database.deleteSession(sessionHash(token));
  res.setHeader("Set-Cookie",`${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`); res.json({ok:true});
}));
app.get("/api/admin/session",adminOnly,(req,res)=>res.json({ok:true}));
app.get("/api/admin/site-settings",adminOnly,asyncRoute(async (req,res)=>{
  const setting=await database.getSiteSetting("anime_display");
  res.json({animeDisplay:setting?.value==="true"});
}));
app.patch("/api/admin/site-settings",adminOnly,asyncRoute(async (req,res)=>{
  if(typeof req.body?.animeDisplay!=="boolean") return res.status(400).json({error:"Choose whether the anime display is on or off."});
  await database.setSiteSetting("anime_display",String(req.body.animeDisplay));
  res.json({ok:true,animeDisplay:req.body.animeDisplay});
}));
app.get("/api/admin/products",adminOnly,asyncRoute(async (req,res)=>res.json(await database.listProducts())));
app.get("/api/admin/orders",adminOnly,asyncRoute(async (req,res)=>res.json((await database.listOrders()).map(o=>({...o,downloadToken:undefined})))));
app.get("/api/admin/inquiries",adminOnly,asyncRoute(async (req,res)=>res.json(await database.listInquiries())));
app.patch("/api/admin/inquiries/:id",adminOnly,asyncRoute(async (req,res)=>{
  const status=String(req.body?.status||"");
  if(!["new","contacted","archived"].includes(status)) return res.status(400).json({error:"Choose a valid inquiry status."});
  const result=await database.updateInquiryStatus(String(req.params.id).slice(0,80),status);
  if(!result.rowCount) return res.status(404).json({error:"Inquiry not found."});
  res.json({ok:true});
}));
const upload = multer({storage:multer.diskStorage({
  destination:(req,file,cb)=>cb(null,PRIVATE_DIR),
  filename:(req,file,cb)=>cb(null,crypto.randomBytes(12).toString("hex")+path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g,""))
}),limits:{fileSize:100*1024*1024}});
app.post("/api/admin/products",adminOnly,upload.single("file"),asyncRoute(async (req,res)=>{
  try {
    const body=req.body;
    const id=(body.id||crypto.randomUUID()).toLowerCase().replace(/[^a-z0-9-]/g,"-").slice(0,80);
    if(!body.name || !body.category || !Number.isFinite(Number(body.price)) || Number(body.price)<1) return res.status(400).json({error:"Name, category and a price of at least ₹1 are required."});
    const existing=await database.findProduct(id);
    const product={id,name:String(body.name).slice(0,120),category:String(body.category).slice(0,80),description:String(body.description||"").slice(0,2000),price:Math.round(Number(body.price)),currency:"INR",active:body.active!=="false",featured:body.featured==="true",fileName:req.file?req.file.filename:(existing?.fileName||null)};
    await database.saveProduct(product); res.json({ok:true,product:cleanProduct(product)});
  } catch(e) { res.status(500).json({error:"Could not save product."}); }
}));
app.delete("/api/admin/products/:id",adminOnly,asyncRoute(async (req,res)=>{
  const p=await database.findProduct(req.params.id);
  if(!p) return res.status(404).json({error:"Product not found."});
  await database.deactivateProduct(p.id); res.json({ok:true});
}));

app.post("/api/checkout/create-order", async (req,res)=>{
  try {
    const items=Array.isArray(req.body.items)?req.body.items:[];
    if(!items.length || items.length>30) return res.status(400).json({error:"Cart is empty or too large."});
    const products=await database.listProducts(true);
    const lineItems=[];
    for(const item of items) {
      const p=products.find(x=>x.id===item.id && x.active);
      const qty=Math.max(1,Math.min(10,Math.floor(Number(item.quantity)||1)));
      if(!p) return res.status(400).json({error:"A product in your cart is unavailable."});
      if(!p.fileName) return res.status(400).json({error:`“${p.name}” is a sample listing. Admin must upload its file before purchase.`});
      lineItems.push({id:p.id,name:p.name,price:p.price,quantity:qty,fileName:p.fileName});
    }
    const amount=lineItems.reduce((s,i)=>s+i.price*i.quantity,0)*100;
    if(!hasRazorpay()) return res.status(503).json({error:"Demo mode is active. Configure Razorpay TEST keys in .env to test checkout. No payment was taken."});
    const order=await razorpay().orders.create({amount,currency:process.env.CURRENCY||"INR",receipt:"ra_"+Date.now().toString(36),notes:{store:"Rawandale Architects"}});
    const orderRecord={id:crypto.randomUUID(),razorpayOrderId:order.id,amount,currency:order.currency,status:"created",items:lineItems,createdAt:new Date().toISOString(),email:String(req.body.email||"").slice(0,200),downloadToken:null};
    await database.insertOrder(orderRecord);
    res.json({orderId:order.id,amount:order.amount,currency:order.currency,keyId:process.env.RAZORPAY_KEY_ID,description:"Rawandale Architects digital downloads"});
  } catch(e) { console.error("Create order failed:",e.message); res.status(500).json({error:e.message.includes("credentials")?e.message:"Could not create payment order. Please try again."}); }
});
app.post("/api/checkout/verify",asyncRoute(async (req,res)=>{
  try {
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature,email}=req.body;
    if(!razorpay_order_id||!razorpay_payment_id||!razorpay_signature) return res.status(400).json({error:"Payment details are incomplete."});
    const expected=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET||"").update(razorpay_order_id+"|"+razorpay_payment_id).digest("hex");
    if(!safeEqual(expected,razorpay_signature)) return res.status(400).json({error:"Payment verification failed."});
    const order=await database.findOrderByRazorpayId(razorpay_order_id);
    if(!order) return res.status(404).json({error:"Order not found."});
    if(order.status!=="paid") {
      order.status="paid"; order.paymentId=razorpay_payment_id; order.paidAt=new Date().toISOString();
      if(email) order.email=String(email).slice(0,200);
      order.downloadToken=crypto.randomBytes(32).toString("hex");
      await database.savePaidOrder(order);
    }
    res.json({ok:true,downloadUrl:"/download/"+order.downloadToken,orderReference:order.id});
  } catch(e) { res.status(500).json({error:"Could not verify payment."}); }
}));
app.get("/download/:token",asyncRoute(async (req,res)=>{
  const token=String(req.params.token||"");
  if(token.length<32) return res.status(404).send("Download link not found.");
  const order=await database.findOrderByDownloadToken(token);
  if(!order) return res.status(404).send("Download link is invalid.");
  // Each purchased file is served only after verified payment; links are bearer tokens.
  const files=order.items.map(i=>i.fileName).filter(Boolean);
  if(!files.length) return res.status(404).send("No files attached to this order.");
  if(files.length===1) {
    const f=path.join(PRIVATE_DIR,path.basename(files[0]));
    if(!fs.existsSync(f)) return res.status(404).send("File is no longer available.");
    return res.download(f);
  }
  res.type("html").send(`<!doctype html><meta name="viewport" content="width=device-width"><title>Your downloads</title><style>body{font:16px system-ui;max-width:720px;margin:48px auto;padding:0 20px;color:#252622}a{display:block;padding:16px;border:1px solid #ddd;margin:12px 0;color:#222;text-decoration:none;border-radius:8px}</style><h1>Your Rawandale downloads</h1><p>Use the links below to download your purchased files.</p>${files.map(f=>`<a href="/download-file/${encodeURIComponent(token)}/${encodeURIComponent(path.basename(f))}">Download ${path.basename(f).replace(/[<>&"]/g,"")}</a>`).join("")}`);
}));
app.get("/download-file/:token/:file",asyncRoute(async (req,res)=>{
  const token=String(req.params.token||""), file=path.basename(req.params.file||"");
  const order=await database.findOrderByDownloadToken(token);
  if(order && !order.items.some(i=>i.fileName===file)) return res.status(404).send("Download link not found.");
  if(!order) return res.status(404).send("Download link not found.");
  const full=path.join(PRIVATE_DIR,file);
  if(!fs.existsSync(full)) return res.status(404).send("File not found.");
  res.download(full);
}));
app.post("/api/razorpay/webhook",(req,res)=>{
  // Razorpay webhook signature must be checked against the raw request body.
  // This endpoint is intentionally handled by the raw parser below in production deployment.
  res.status(501).json({error:"Webhook endpoint not enabled in this starter. Signature verification endpoint is used for checkout; configure a raw-body verified webhook before production."});
});
app.get("*",(req,res)=>res.sendFile(path.join(ROOT,"public","index.html")));
database.init(defaultProducts).then(()=>{
  const server=app.listen(PORT,()=>console.log(`Rawandale Architects website running at http://localhost:${PORT} (${database.isPostgres?"PostgreSQL":"SQLite"})`));
  const shutdown=async()=>{server.close();await database.close();process.exit(0);};
  process.once("SIGINT",shutdown);
  process.once("SIGTERM",shutdown);
}).catch(error=>{console.error("Database initialization failed:",error.message);process.exitCode=1;});

