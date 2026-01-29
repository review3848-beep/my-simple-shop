import { listProducts, createOrder, listOrdersByPhone } from "./api.js";

/* ===== DOM ===== */
const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const dotEl = document.getElementById("dot");
const countEl = document.getElementById("count");

const modalBack = document.getElementById("modalBack");
const btnClose = document.getElementById("btnClose");
const btnSubmit = document.getElementById("btnSubmit");
const msgEl = document.getElementById("msg");

const mName = document.getElementById("mName");
const mPrice = document.getElementById("mPrice");
const summaryEl = document.getElementById("summary");

const fName = document.getElementById("fName");
const fPhone = document.getElementById("fPhone");
const fQty = document.getElementById("fQty");
const fAddress = document.getElementById("fAddress");
const fNote = document.getElementById("fNote");

const btnMyOrders = document.getElementById("btnMyOrders");

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ===== STATE ===== */
let selected = null;

/* ===== INIT ===== */
renderSkeleton(8);
init();

/* ===== UX helpers ===== */
window.scrollToProducts = function () {
  const el = document.getElementById("products");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.openHelp = function () {
  alert(
    "วิธีสั่งซื้อ:\n" +
      "1) เลือกสินค้าแล้วกด “สั่งซื้อเลย”\n" +
      "2) กรอกชื่อ/เบอร์/ที่อยู่\n" +
      "3) กด “ยืนยันสั่งซื้อ” ระบบจะบันทึกเข้าชีต ORDERS\n\n" +
      "ทิป: ถ้ากด “ออเดอร์ของฉัน” จะดูรายการที่สั่งไปแล้วได้ (ใช้เบอร์โทร)"
  );
};

async function init() {
  try {
    statusEl.textContent = "กำลังโหลดสินค้า…";
    dotEl.classList.remove("ok");

    const items = await listProducts();
    renderProducts(items);

    statusEl.textContent = "พร้อมขายแล้ว 💜";
    dotEl.classList.add("ok");
  } catch (err) {
    statusEl.textContent = "มีปัญหาในการโหลด";
    dotEl.classList.remove("ok");
    grid.innerHTML = `
      <div class="pill" style="grid-column:1/-1;justify-content:center;">
        ❌ ${escapeHtml(String(err))}
      </div>
    `;
  }
}

/* ===== RENDER ===== */
function renderSkeleton(n) {
  grid.innerHTML = Array.from({ length: n })
    .map(
      () => `
    <div class="skel">
      <div class="img"></div>
      <div class="bar" style="width:70%"></div>
      <div class="bar" style="width:45%"></div>
      <div class="bar" style="width:85%; height:40px; border-radius:16px"></div>
    </div>
  `
    )
    .join("");
}

function renderProducts(items) {
  countEl.textContent = items.length ? `${items.length} รายการ` : "";

  if (!items.length) {
    grid.innerHTML = `
      <div class="pill" style="grid-column:1/-1;justify-content:center;">
        ยังไม่มีสินค้าในระบบ (ไปเพิ่มในชีต PRODUCTS แล้วตั้ง status = active)
      </div>
    `;
    return;
  }

  grid.innerHTML = items
    .map((p) => {
      const safe = {
        id: String(p.id || ""),
        name: String(p.name || ""),
        price: Number(p.price || 0),
        img: String(p.img || ""),
      };

      const hasImg = !!safe.img;
      return `
        <div class="card">
          <div class="thumb">
            ${
              hasImg
                ? `<img src="${escapeAttr(safe.img)}" alt="${escapeAttr(
                    safe.name
                  )}" onerror="this.remove(); this.parentElement.querySelector('.ph').style.display='block';" />`
                : ``
            }
            <div class="ph" style="display:${hasImg ? "none" : "block"};">ไม่มีรูปสินค้า</div>
          </div>

          <div class="pad">
            <div class="name">${escapeHtml(safe.name)}</div>

            <div class="priceLine">
              <div class="price">฿${safe.price.toLocaleString()}</div>
              <div class="badge">พร้อมส่ง</div>
            </div>

            <button class="buyBtn" data-buy='${escapeAttr(JSON.stringify(safe))}'>
              🛒 สั่งซื้อเลย
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  // bind buy buttons (ไม่ใช้ inline onclick เพื่อความชัวร์บน Pages)
  grid.querySelectorAll("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = JSON.parse(btn.getAttribute("data-buy"));
      openBuy(p);
    });
  });
}

/* ===== BUY MODAL ===== */
function openBuy(p) {
  selected = p;

  msgEl.textContent = "";
  msgEl.className = "msg";

  mName.textContent = "สั่งซื้อ: " + p.name;
  mPrice.textContent = "ราคา: ฿" + Number(p.price || 0).toLocaleString();

  fQty.value = 1;
  fNote.value = "";

  // auto fill phone (ถ้าเคยสั่งไว้)
  const savedPhone = localStorage.getItem("myshop_phone");
  if (savedPhone && !fPhone.value) fPhone.value = savedPhone;

  summaryEl.textContent = `รวมโดยประมาณ: ฿${Number(p.price || 0).toLocaleString()}`;

  modalBack.style.display = "flex";
  setTimeout(() => fName.focus(), 50);
}

btnClose?.addEventListener("click", () => (modalBack.style.display = "none"));
modalBack?.addEventListener("click", (e) => {
  if (e.target === modalBack) modalBack.style.display = "none";
});

fQty?.addEventListener("input", () => {
  if (!selected) return;
  const qty = Math.max(1, Number(fQty.value || 1));
  const total = Number(selected.price || 0) * qty;
  summaryEl.textContent = `รวมโดยประมาณ: ฿${total.toLocaleString()}`;
});

/* ===== SUBMIT ORDER ===== */
btnSubmit?.addEventListener("click", async () => {
  if (!selected) return;

  const qty = Math.max(1, Number(fQty.value || 1));
  const payload = {
    productId: String(selected.id).trim(),
    qty,
    customerName: fName.value.trim(),
    phone: fPhone.value.trim(),
    address: fAddress.value.trim(),
    note: fNote.value.trim(),
  };

  if (!payload.customerName || !payload.phone || !payload.address) {
    msgEl.textContent = "กรอกชื่อ/เบอร์/ที่อยู่ให้ครบก่อนนะ";
    msgEl.className = "msg bad";
    return;
  }

  btnSubmit.disabled = true;
  msgEl.textContent = "กำลังบันทึกออเดอร์…";
  msgEl.className = "msg";

  try {
    const data = await createOrder(payload);

    // ✅ จำเบอร์ไว้ดูออเดอร์ทีหลัง
    localStorage.setItem("myshop_phone", payload.phone);

    msgEl.textContent = `สำเร็จ ✅ เลขออเดอร์: ${data.orderId} | รวม ฿${Number(
      data.total || 0
    ).toLocaleString()}`;
    msgEl.className = "msg ok";
  } catch (err) {
    msgEl.textContent = "พังแล้ว ❌ " + String(err);
    msgEl.className = "msg bad";
  } finally {
    btnSubmit.disabled = false;
  }
});

/* ===== MY ORDERS ===== */
btnMyOrders?.addEventListener("click", async () => {
  const saved = localStorage.getItem("myshop_phone") || "";
  const phone = prompt("ใส่เบอร์โทรที่ใช้สั่งซื้อ:", saved);
  if (!phone) return;

  localStorage.setItem("myshop_phone", phone.trim());

  try {
    const orders = await listOrdersByPhone(phone.trim());

    if (!orders.length) {
      alert("ยังไม่พบออเดอร์ของเบอร์นี้");
      return;
    }

    const lines = orders
      .map((o) => {
        const total = Number(o.total || 0).toLocaleString();
        const qty = Number(o.qty || 0);
        const created = o.createdAt ? `(${o.createdAt})` : "";
        return `#${o.orderId || "-"} ${created}\n- ${o.productName} x${qty} = ฿${total}\n`;
      })
      .join("\n");

    alert("ออเดอร์ของฉัน:\n\n" + lines);
  } catch (err) {
    alert("โหลดออเดอร์ไม่สำเร็จ: " + err);
  }
});

/* ===== Utils ===== */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
