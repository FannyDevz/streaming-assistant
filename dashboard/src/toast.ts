// Toast notifikasi ringan (DOM langsung, gaya neobrutalism).
export function toast(text: string, ok = true): void {
  let box = document.getElementById("sa-toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "sa-toasts";
    box.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:flex-end;";
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText =
    `border:3px solid #000;box-shadow:5px 5px 0 #000;padding:10px 14px;font-weight:800;` +
    `max-width:340px;transition:opacity .3s, transform .3s;transform:translateY(0);` +
    `background:${ok ? "#7cf07c" : "#ff6b6b"};color:${ok ? "#000" : "#fff"};`;
  box.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 320);
  }, 2600);
}
