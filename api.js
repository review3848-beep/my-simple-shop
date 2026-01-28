// api.js — Simple Shop API client (Google Apps Script Web App)

export const API_URL =
  "https://script.google.com/macros/s/AKfycbwPExSc4fYjJlAwzHdf02CRrMiFjOMU9aPUy3wSDWhoAmV0roCxKXIyk9rh7SY8XL8EHg/exec";

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("API ไม่ได้ส่ง JSON กลับมา");
  }
}

export async function listProducts() {
  if (!API_URL || !API_URL.includes("/exec")) throw new Error("API_URL ไม่ถูกต้อง");

  const res = await fetch(`${API_URL}?action=listProducts`, { method: "GET" });
  const json = await readJson(res);

  if (!json.ok) throw new Error(json.error || "โหลดสินค้าไม่สำเร็จ");
  return json.data || [];
}

export async function createOrder(payload) {
  if (!API_URL || !API_URL.includes("/exec")) throw new Error("API_URL ไม่ถูกต้อง");

  const body = {
    action: "createOrder",
    productId: String(payload.productId || "").trim(),
    qty: Math.max(1, Number(payload.qty || 1)),
    customerName: String(payload.customerName || "").trim(),
    phone: String(payload.phone || "").trim(),
    address: String(payload.address || "").trim(),
    note: String(payload.note || "").trim(),
  };

  // ✅ สำคัญ: ส่งเป็น text/plain เพื่อหลบ CORS preflight
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });

  const json = await readJson(res);
  if (!json.ok) throw new Error(json.error || "สั่งซื้อไม่สำเร็จ");
  return json.data; // { orderId, total }
}
