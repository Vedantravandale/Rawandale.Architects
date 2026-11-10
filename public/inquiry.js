const form=document.querySelector("#inquiry-form");
const status=document.querySelector("#inquiry-status");
form.addEventListener("submit",async event=>{
  event.preventDefault();
  status.textContent="Sending your enquiry…";
  status.classList.remove("success","error");
  const button=form.querySelector("button[type=submit]");
  button.disabled=true;
  try{
    const response=await fetch("/api/inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||"Your enquiry could not be sent. Please try again.");
    status.textContent="Thank you — your enquiry has been received. The studio will be in touch soon.";
    status.classList.add("success");
    form.reset();
  }catch(error){status.textContent=error.message;status.classList.add("error")}
  finally{button.disabled=false}
});
