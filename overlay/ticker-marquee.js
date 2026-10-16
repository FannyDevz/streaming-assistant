// Marquee mulus untuk semua ticker overlay (runtext / ticker / requests).
//
// Masalah lama: `block + block` lalu `translateX(-50%)` hanya looping mulus kalau
// SATU salinan konten lebih lebar dari viewport. Di kanvas lebar (mis. 1920px)
// dengan konten pendek, dua salinan pun masih lebih sempit dari layar sehingga
// strip cuma bergoyang di kiri dan tampak "tidak looping".
//
// Solusi: ulang konten secukupnya hingga melebihi lebar viewport + 1 salinan,
// lalu geser TEPAT selebar satu salinan (var --shift). Karena tiap salinan
// identik, di akhir animasi tampilannya sama persis dengan awal → looping mulus
// di ukuran berapa pun. Kecepatan tetap ~60px/detik.
(function (global) {
  "use strict";

  const PX_PER_SEC = 60;
  const registry = new Set();

  function measureAndApply(track) {
    const block = track.__mqBlock;
    if (!block) return;
    // Ukur satu salinan dulu (matikan animasi supaya pengukuran stabil).
    track.style.animation = "none";
    track.innerHTML = block;
    const copyW = track.scrollWidth;
    if (copyW <= 0) return; // belum ter-layout / tersembunyi
    const vp =
      (track.parentElement && track.parentElement.clientWidth) || global.innerWidth || copyW;
    // Cukup salinan untuk menutupi viewport + 1 salinan; minimal 2 agar mulus.
    const copies = Math.max(2, Math.ceil(vp / copyW) + 1);
    track.innerHTML = block.repeat(copies);
    track.style.setProperty("--shift", copyW + "px");
    const dur = Math.max(12, Math.round(copyW / PX_PER_SEC));
    void track.offsetWidth; // paksa reflow sebelum menyalakan animasi lagi
    track.style.animation = `marquee ${dur}s linear infinite`;
  }

  // set(track, block): mulai marquee dengan HTML `block` (satu salinan konten).
  // set(track, null|""): hentikan marquee (caller boleh isi placeholder sendiri).
  function set(track, block) {
    if (!track) return;
    if (!block) {
      track.__mqBlock = null;
      registry.delete(track);
      track.style.animation = "none";
      track.style.removeProperty("--shift");
      return;
    }
    track.__mqBlock = block;
    registry.add(track);
    measureAndApply(track);
  }

  // Re-hitung saat ukuran kanvas berubah (OBS bisa resize) — di-debounce via rAF.
  let raf = 0;
  global.addEventListener("resize", () => {
    if (raf) return;
    raf = global.requestAnimationFrame(() => {
      raf = 0;
      registry.forEach(measureAndApply);
    });
  });

  // Font web bisa mengubah lebar setelah load → ukur ulang saat font siap.
  if (global.document && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => registry.forEach(measureAndApply)).catch(() => {});
  }

  global.TickerMarquee = { set: set };
})(window);
