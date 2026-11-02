---
applyTo: "apps/api/public/**"
---

# قواعد واجهة العمليات (vanilla HTML/CSS/JS)

- **بلا بناء:** ملفات ثابتة تُقدَّم من Express. ممنوع إدخال React/Next/Vite/Tailwind، وممنوع `import` عبر حزم.
- **اللغة:** عربية RTL، `<html lang="ar" dir="rtl">`. كل النصوص الظاهرة عربية، والتواريخ والأرقام عبر `Intl` بمنطقة `ar-SA`.
- **الأمان في DOM:** أي قيمة من الـAPI تُمرَّر عبر `esc()` قبل الإدراج في HTML. لا `innerHTML` لمحتوى غير مُهرَّب.
- **الشبكة:** استخدم دالة `api(path)` الموجودة (تتعامل مع 401/refresh) وعنوان `API` النسبي أو `window.RIHAL_API_BASE`. لا `fetch` مباشر جديد.
- **البيانات:** لا تُخزّن استجابات الـAPI في `localStorage`؛ الجلسة فقط في `sessionStorage`.
- **النماذج:** استخدم محرّك `modal.open({fields, bodyHtml, onSubmit})` بدل نماذج مخصّصة جديدة.
- **الحالات:** أسماء الحالات تأتي من `LABELS`/`TONE`/`NEXT` في `app.js`؛ أضف أي حالة جديدة في الثلاثة معًا.
- **PWA:** `sw.js` لا يخزّن أي مسار تحت `/api/` — لا تُغيّر هذا السلوك.
- **التحقق:** بعد أي تعديل شغّل الخادم واختبر عبر `node tooling/serve-console.mjs` أو `http://localhost:4000/` (دخول، تنقّل، إنشاء سجل، خطأ 401).
