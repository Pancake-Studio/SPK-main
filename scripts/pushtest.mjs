import webpush from "web-push";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const priv = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:admin@suntisuk.ac.th";
console.log("pub len", pub?.length, "priv len", priv?.length, "subject", subject);

try {
  webpush.setVapidDetails(subject, pub, priv);
  console.log("setVapidDetails OK");
} catch (e) {
  console.log("setVapidDetails THREW:", e?.message);
}

const subs = await prisma.pushSubscription.findMany();
console.log("subscriptions:", subs.length);

for (const s of subs) {
  console.log(
    "--- host:",
    new URL(s.endpoint).host,
    "p256dh len",
    s.p256dh.length,
    "auth len",
    s.auth.length,
  );
  try {
    const r = await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify({ title: "ทดสอบ", message: "hello from script", tag: "test" }),
    );
    console.log("SEND OK statusCode=", r.statusCode);
  } catch (e) {
    console.log("SEND ERR:");
    console.log("  name      =", e?.name);
    console.log("  message   =", e?.message);
    console.log("  statusCode=", e?.statusCode);
    console.log("  code      =", e?.code);
    console.log("  body      =", e?.body);
    console.log("  headers   =", JSON.stringify(e?.headers));
    if (!e?.statusCode) console.log("  stack:\n", e?.stack?.split("\n").slice(0, 6).join("\n"));
  }
}
await prisma.$disconnect();
