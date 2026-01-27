import { listProducts, createOrder } from "./api.js";

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

document.getElementById("year").textContent = new Date().getFullYear();

let selected = null;

window.scrollToProducts = function () {
  document.getElementById("products").scrollIntoView({ behavior: "smooth", block: "start" });
};

window.openHelp = function () {
  alert(
    "วิธีสั่งซื้อ:\n1) เลือกสินค้าแล้วกดสั่งซื้อ\n2) กรอกชื่อ/เบอร์/ที่อยู่\n3) กดยืนยัน ระบบจะออกเลขออเดอร์ให้\n(หลังบ้านไปดูที่ Google Sheet: ORDERS)"
  );
};

renderSkeleton(8);
init();

async function init() {
  try {
    const items = await listProducts();
    renderProducts(items);

    statusEl.textContent = "พร้อมขายแล้ว 💜";
    dotEl.classList.add("ok");
  } catch (err) {
    statusEl.textContent = "มีปัญหาในการโหลด";
    dotEl.classList.remove("ok");
    grid.innerHTML = `<div class="pill" style="grid-column:1/-1;justify-content:center;">
      ❌ ${escapeHtml(String(err))}
    </div>`;
  }
}

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
    grid.innerHTML = `<div class="pill" style="grid-column:1/-1;justify-content:center;">
      ยังไม่มีสินค้าในระบบ (ไปเพิ่มในชีต PRODUCTS แล้วตั้ง status = active)
    </div>`;
    return;
  }

  const normalized = items.map((p) => ({
    id: String(p.id || ""),
    name: String(p.name || ""),
    price: Number(p.price || 0),
    img: String(p.img || ""),
  }));

  grid.innerHTML = normalized
    .map((safe) => {
      const hasImg = !!safe.img;
      return `
        <div class="card">
          <div class="thumb">
            ${
              hasImg
                ? `<img src="${escapeAttr(safe.img)}" alt="${escapeAttr(safe.name)}"
                     onerror="this.remove(); this.parentElement.querySelector('.ph').style.display='block';" />`
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

            <button class="buyBtn" data-id="${escapeAttr(safe.id)}">
              🛒 สั่งซื้อเลย
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  // bind click แบบไม่ต้อง inline onclick
  grid.querySelectorAll(".buyBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const item = normalized.find((x) => x.id === id);
      if (item) openBuy(item);
    });
  });
}

function openBuy(p) {
  selected = p;

  msgEl.textContent = "";
  msgEl.className = "msg";

  mName.textContent = "สั่งซื้อ: " + p.name;
  mPrice.textContent = "ราคา: ฿" + Number(p.price || 0).toLocaleString();

  fQty.value = 1;
  fNote.value = "";
  summaryEl.textContent = `รวมโดยประมาณ: ฿${Number(p.price || 0).toLocaleString()}`;

  modalBack.style.display = "flex";
  setTimeout(() => fName.focus(), 50);
}

btnClose.onclick = () => (modalBack.style.display = "none");
modalBack.addEventListener("click", (e) => {
  if (e.target === modalBack) modalBack.style.display = "none";
});

fQty.addEventListener("input", () => {
  if (!selected) return;
  const qty = Math.max(1, Number(fQty.value || 1));
  const total = Number(selected.price || 0) * qty;
  summaryEl.textContent = `รวมโดยประมาณ: ฿${total.toLocaleString()}`;
});

btnSubmit.onclick = async () => {
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
    const total = Number(data.total || 0);

    msgEl.textContent = `สำเร็จ ✅ เลขออเดอร์: ${data.orderId} | รวม ฿${total.toLocaleString()}`;
    msgEl.className = "msg ok";
  } catch (err) {
    msgEl.textContent = "พังแล้ว ❌ " + String(err);
    msgEl.className = "msg bad";
  } finally {
    btnSubmit.disabled = false;
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
