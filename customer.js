// -- SUPABASE SETUP --
const SUPABASE_URL = "https://mdpmktdfszztukfgqwjq.supabase.co"; // Replace with your Supabase URL
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcG1rdGRmc3p6dHVrZmdxd2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMDQ0MTksImV4cCI6MjA3MDY4MDQxOX0.NBlC_7cqv7WscIryrJEPpfpktP8YerbsHfKp8UbjqHU"; // Replace with your Supabase anon key

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Pure anon client that forces anon role by not persisting session or JWT
const anonDb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { apikey: SUPABASE_ANON_KEY } },
});
// -- END SUPABASE SETUP --

// App State
let currentUser = "";
let cart = [];
let menuItems = [];
let availableCategories = [];
let restaurantId = null;
let universalParcelCharge = 0;

// DOM Elements
const customerView = document.getElementById("customerView");
const nameModal = document.getElementById("nameModal");
const customerName = document.getElementById("customerName");
const startOrdering = document.getElementById("startOrdering");
const menuSection = document.getElementById("menuSection");
const cartSection = document.getElementById("cartSection");
const invoiceSection = document.getElementById("invoiceSection");
const cartIcon = document.getElementById("cartIcon");
const cartCount = document.getElementById("cartCount");
const viewCartBtn = document.getElementById("viewCartBtn");
const backToMenu = document.getElementById("backToMenu");
const proceedToCheckout = document.getElementById("proceedToCheckout");
const newOrderBtn = document.getElementById("newOrderBtn");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const modifyOrderBtn = document.getElementById("modifyOrderBtn");
const cancelOrderBtn = document.getElementById("cancelOrderBtn");

// Initialize App
async function init() {
  const params = new URLSearchParams(window.location.search);
  restaurantId = params.get("restaurant");
  if (!restaurantId) {
    document.body.innerHTML =
      "<h1>Restaurant not specified. Please provide a restaurant ID in the URL (e.g., ?restaurant=1).</h1>";
    return;
  }

  await loadDataFromSupabase();
  renderMenu();
  updateCartUI();
}

// Navigation
function showMenuSection() {
  menuSection.classList.remove("hidden");
  cartSection.classList.add("hidden");
  invoiceSection.classList.add("hidden");
  viewCartBtn.classList.remove("hidden");
}

window.showCartSection = function () {
  menuSection.classList.add("hidden");
  cartSection.classList.remove("hidden");
  invoiceSection.classList.add("hidden");
  viewCartBtn.classList.add("hidden");
  renderCart();
};

function showInvoiceSection() {
  menuSection.classList.add("hidden");
  cartSection.classList.add("hidden");
  invoiceSection.classList.remove("hidden");
  viewCartBtn.classList.add("hidden");
  renderInvoicePreview();
}

viewCartBtn.addEventListener("click", showCartSection);
backToMenu.addEventListener("click", showMenuSection);
proceedToCheckout.addEventListener("click", showInvoiceSection);
newOrderBtn.addEventListener("click", () => {
  cart = [];
  updateCartUI();
  showMenuSection();
});
placeOrderBtn.addEventListener("click", placeOrder);
modifyOrderBtn.addEventListener("click", showCartSection);
cancelOrderBtn.addEventListener("click", () => {
  cart = [];
  updateCartUI();
  showMenuSection();
});

// Customer Name Setup
startOrdering.addEventListener("click", () => {
  const name = customerName.value.trim();
  if (name) {
    currentUser = name;
    nameModal.classList.add("hidden");
    document.getElementById(
      "customerGreeting"
    ).textContent = `Welcome, ${name}! 👋`;
    showMenuSection();
  }
});

customerName.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    startOrdering.click();
  }
});

// Helper function to create safe IDs from category names
function sanitizeForId(text) {
  return text.replace(/[^a-zA-Z0-9]/g, "-");
}

// Menu Rendering
function renderMenu() {
  const menuContainer = document.getElementById("menuContainer");
  menuContainer.innerHTML = "";

  const categories = {};
  menuItems.forEach((item) => {
    if (!categories[item.category]) {
      categories[item.category] = [];
    }
    categories[item.category].push(item);
  });

  const categoryOrder = availableCategories.map((c) => c.name);

  categoryOrder.forEach((categoryName) => {
    const sanitizedCategoryName = sanitizeForId(categoryName);
    if (categories[categoryName]) {
      const categorySection = document.createElement("div");
      categorySection.className = "category-section";
      categorySection.innerHTML = `
                <div class="category-header" onclick="toggleCategory('${sanitizedCategoryName}')">
                    <div class="category-title">
                        <span>${categoryName}</span>
                        <div class="category-info">
                            <span class="item-count">${categories[categoryName].length} items</span>
                            <span class="category-arrow" id="arrow-${sanitizedCategoryName}" style="transform: rotate(-90deg);">▼</span>
                        </div>
                    </div>
                </div>
                <div class="category-content category-collapsed" id="content-${sanitizedCategoryName}">
                    <div class="menu-grid" id="category-${sanitizedCategoryName}"></div>
                </div>
            `;
      menuContainer.appendChild(categorySection);

      const categoryGrid = categorySection.querySelector(
        `#category-${sanitizedCategoryName}`
      );
      categories[categoryName].forEach((item) => {
        const menuCard = document.createElement("div");
        menuCard.className = "menu-card";
        menuCard.innerHTML = `
                    <div class="menu-card-content">
                        <h3 class="menu-name">${item.name}</h3>
                        <p class="menu-description">${item.description}</p>
                        <div class="menu-footer">
                            <span class="menu-price">₹${item.price}</span>
                            <button onclick="addToCart(${
                              item.id
                            })" class="btn btn-primary" ${
          !item.in_stock
            ? 'disabled style="opacity: 0.5; cursor: not-allowed;"'
            : ""
        }>
                                ${
                                  !item.in_stock
                                    ? "Out of Stock"
                                    : "Add to Cart"
                                }
                            </button>
                        </div>
                    </div>
                `;
        categoryGrid.appendChild(menuCard);
      });
    }
  });
}

window.toggleCategory = function (sanitizedCategoryName) {
  const content = document.getElementById(`content-${sanitizedCategoryName}`);
  const arrow = document.getElementById(`arrow-${sanitizedCategoryName}`);

  if (content.classList.contains("category-expanded")) {
    content.classList.remove("category-expanded");
    content.classList.add("category-collapsed");
    arrow.style.transform = "rotate(-90deg)";
  } else {
    content.classList.remove("category-collapsed");
    content.classList.add("category-expanded");
    arrow.style.transform = "rotate(0deg)";
  }
};

window.toggleOption = function (optionId) {
  const content = document.getElementById(`content-${optionId}`);
  const arrow = document.getElementById(`arrow-${optionId}`);

  if (content.classList.contains("expanded")) {
    content.classList.remove("expanded");
    arrow.style.transform = "rotate(-90deg)";
  } else {
    content.classList.add("expanded");
    arrow.style.transform = "rotate(0deg)";
  }
};

// Cart Functions
window.addToCart = function (itemId) {
  const item = menuItems.find((i) => i.id === itemId);

  if (!item.in_stock) {
    return;
  }

  const existingCartItem = cart.find((cartItem) => cartItem.id === itemId);

  if (existingCartItem) {
    existingCartItem.dineInQty += 1;
  } else {
    const cartItem = {
      ...item,
      dineInQty: 1,
      takeawayQty: 0,
      cartId: Date.now() + Math.random(),
      note: "",
    };
    cart.push(cartItem);
  }

  updateCartUI();

  const button = event.target;
  const originalText = button.textContent;
  button.textContent = "Added! ✓";
  button.classList.add("btn-success");
  setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove("btn-success");
  }, 1000);
};

window.removeFromCart = function (cartId) {
  cart = cart.filter((item) => item.cartId !== cartId);
  updateCartUI();
  renderCart();
};

window.updateDiningQuantity = function (cartId, option, change) {
  const numericCartId =
    typeof cartId === "string" ? parseFloat(cartId) : cartId;
  const item = cart.find((i) => i.cartId === numericCartId);

  if (item) {
    if (option === "dine-in") {
      item.dineInQty = Math.max(0, item.dineInQty + change);
    } else if (option === "takeaway") {
      item.takeawayQty = Math.max(0, item.takeawayQty + change);
    }

    if (item.dineInQty === 0 && item.takeawayQty === 0) {
      removeFromCart(cartId);
    } else {
      updateCartUI();
      renderCart();
    }
  }
};

window.updateItemNote = function (cartId, note) {
  const numericCartId =
    typeof cartId === "string" ? parseFloat(cartId) : cartId;
  const item = cart.find((i) => i.cartId === numericCartId);
  if (item) {
    item.note = note;
  }
};

function updateCartUI() {
  const totalItems = cart.reduce(
    (sum, item) => sum + (item.dineInQty + item.takeawayQty),
    0
  );

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * (item.dineInQty + item.takeawayQty),
    0
  );

  const totalParcelCharge = cart.reduce((sum, item) => {
    const charge =
      item.parcel_charge > 0 ? item.parcel_charge : universalParcelCharge;
    return sum + charge * item.takeawayQty;
  }, 0);

  const grandTotal = subtotal + totalParcelCharge;

  cartCount.textContent = totalItems;
  document.getElementById("cartTotal").textContent = `₹${grandTotal.toFixed(
    2
  )}`;

  const cartTotalAmountContainer = document.getElementById("cartTotalAmount");
  cartTotalAmountContainer.innerHTML = `
      <div class="cart-total-breakdown">
          <div><span>Subtotal:</span> <span>₹${subtotal.toFixed(2)}</span></div>
          ${
            totalParcelCharge > 0
              ? `<div><span>Parcel Charges:</span> <span>₹${totalParcelCharge.toFixed(
                  2
                )}</span></div>`
              : ""
          }
          <div class="grand-total"><span>Total:</span> <span>₹${grandTotal.toFixed(
            2
          )}</span></div>
      </div>
  `;

  proceedToCheckout.disabled = cart.length === 0;

  if (totalItems > 0) {
    viewCartBtn.classList.remove("hidden");
  } else {
    viewCartBtn.classList.add("hidden");
  }
}

function renderCart() {
  const cartItemsContainer = document.getElementById("cartItems");

  if (cart.length === 0) {
    cartItemsContainer.innerHTML =
      '<p class="empty-state">Your cart is empty</p>';
    return;
  }

  cartItemsContainer.innerHTML = cart
    .map((item) => {
      const totalQty = item.dineInQty + item.takeawayQty;
      const applicableParcelCharge =
        item.parcel_charge > 0 ? item.parcel_charge : universalParcelCharge;
      const parcelChargeInfo =
        applicableParcelCharge > 0
          ? `<span class="parcel-charge-info">(+₹${applicableParcelCharge}/item)</span>`
          : "";

      return `
        <div class="cart-item">
            <div class="cart-item-header">
                <div class="cart-item-info">
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p>₹${item.price} each • Total: ${totalQty} items</p>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <span style="font-weight: bold; color: #ea580c;">₹${(
                      item.price * totalQty
                    ).toFixed(2)}</span>
                    <button onclick="removeFromCart('${
                      item.cartId
                    }')" class="remove-btn">🗑️</button>
                </div>
            </div>
            
            <div class="cart-item-options">
                <div class="dining-option">
                    <div class="option-header" onclick="toggleOption('dining-${
                      item.cartId
                    }')">
                        <span><span class="order-icon">🍽️</span> Dining Options & Quantities</span>
                        <span class="option-arrow" id="arrow-dining-${
                          item.cartId
                        }">▼</span>
                    </div>
                    <div class="option-content expanded" id="content-dining-${
                      item.cartId
                    }">
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px;">
                                <span style="display: flex; align-items: center; gap: 8px; font-weight: 500;">
                                    <span class="order-icon">🍽️</span> Dine-in
                                </span>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <button onclick="updateDiningQuantity('${
                                      item.cartId
                                    }', 'dine-in', -1)" 
                                            class="quantity-btn" ${
                                              item.dineInQty === 0
                                                ? 'style="opacity: 0.5;"'
                                                : ""
                                            }>-</button>
                                    <span class="quantity" style="min-width: 32px;">${
                                      item.dineInQty
                                    }</span>
                                    <button onclick="updateDiningQuantity('${
                                      item.cartId
                                    }', 'dine-in', 1)" 
                                            class="quantity-btn">+</button>
                                </div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; ${
                              !item.takeaway_available
                                ? "opacity: 0.5; background: #f9fafb;"
                                : ""
                            }">
                                <span style="display: flex; align-items: center; gap: 8px; font-weight: 500;">
                                    <span class="order-icon">📦</span> Takeaway ${parcelChargeInfo} ${
        !item.takeaway_available ? "(Not Available)" : ""
      }
                                </span>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <button onclick="updateDiningQuantity('${
                                      item.cartId
                                    }', 'takeaway', -1)" 
                                            class="quantity-btn" ${
                                              item.takeawayQty === 0 ||
                                              !item.takeaway_available
                                                ? 'style="opacity: 0.5;" disabled'
                                                : ""
                                            }>-</button>
                                    <span class="quantity" style="min-width: 32px;">${
                                      item.takeawayQty
                                    }</span>
                                    <button onclick="updateDiningQuantity('${
                                      item.cartId
                                    }', 'takeaway', 1)" 
                                            class="quantity-btn" ${
                                              !item.takeaway_available
                                                ? 'disabled style="opacity: 0.5;"'
                                                : ""
                                            }>+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="note-option">
                    <div class="option-header" onclick="toggleOption('note-${
                      item.cartId
                    }')">
                        <span>📝 Special Instructions</span>
                        <span class="option-arrow" id="arrow-note-${
                          item.cartId
                        }">▼</span>
                    </div>
                    <div class="option-content" id="content-note-${
                      item.cartId
                    }">
                        <textarea id="textarea-note-${item.cartId}" 
                                  placeholder="Any special requests? (e.g., no onions, extra spicy, etc.)"
                                  class="note-input"
                                  onchange="updateItemNote('${
                                    item.cartId
                                  }', this.value)"
                                  oninput="updateItemNote('${
                                    item.cartId
                                  }', this.value)">${item.note || ""}</textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
    })
    .join("");
}

// Invoice Generation
function renderInvoicePreview() {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * (item.dineInQty + item.takeawayQty),
    0
  );
  const totalParcelCharge = cart.reduce((sum, item) => {
    const charge =
      item.parcel_charge > 0 ? item.parcel_charge : universalParcelCharge;
    return sum + charge * item.takeawayQty;
  }, 0);
  const grandTotal = subtotal + totalParcelCharge;

  const invoiceContent = document.getElementById("invoiceContent");

  document.getElementById("placeOrderBtn").classList.remove("hidden");
  document.getElementById("modifyOrderBtn").classList.remove("hidden");
  document.getElementById("cancelOrderBtn").classList.remove("hidden");
  document.getElementById("newOrderBtn").classList.add("hidden");
  document.querySelector(".invoice-header p").textContent = "Order Invoice";

  invoiceContent.innerHTML = `
        <div class="invoice-details">
            <div class="invoice-row">
                <div>
                    <p style="font-weight: bold; font-size: 18px;">Order Preview</p>
                    <p style="color: #6b7280;">${new Date().toLocaleString()}</p>
                </div>
                <div>
                    <p style="font-weight: bold; font-size: 18px;">Customer: ${currentUser}</p>
                </div>
            </div>
        </div>
        
        <div class="invoice-items">
            ${cart
              .map((item) => {
                const totalQty = item.dineInQty + item.takeawayQty;
                let diningDetails = [];
                if (item.dineInQty > 0)
                  diningDetails.push(
                    `<span class="order-icon">🍽️</span> Dine-in: ${item.dineInQty}`
                  );
                if (item.takeawayQty > 0)
                  diningDetails.push(
                    `<span class="order-icon">📦</span> Takeaway: ${item.takeawayQty}`
                  );

                return `
                <div class="invoice-item">
                    <div class="invoice-item-info">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span>${item.name}</span>
                                <span style="color: #6b7280;">x${totalQty}</span>
                            </div>
                            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                                ${diningDetails.join(" • ")}
                            </div>
                            ${
                              item.note && item.note.trim()
                                ? `<div style="font-size: 12px; color: #ea580c; margin-top: 4px; font-weight: 500;">📝 Special Instructions: ${item.note.trim()}</div>`
                                : ""
                            }
                        </div>
                    </div>
                    <span style="font-weight: bold;">₹${(
                      item.price * totalQty
                    ).toFixed(2)}</span>
                </div>
                `;
              })
              .join("")}
        </div>
        
        <div class="invoice-total">
            <div class="cart-total-breakdown">
                <div><span>Subtotal:</span> <span>₹${subtotal.toFixed(
                  2
                )}</span></div>
                ${
                  totalParcelCharge > 0
                    ? `<div><span>Parcel Charges:</span> <span>₹${totalParcelCharge.toFixed(
                        2
                      )}</span></div>`
                    : ""
                }
                <div class="grand-total"><span>Total:</span> <span class="invoice-total-amount">₹${grandTotal.toFixed(
                  2
                )}</span></div>
            </div>
        </div>
        
        <div class="invoice-footer">
            <p>Please confirm your order details.</p>
        </div>
    `;
}

async function placeOrder() {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * (item.dineInQty + item.takeawayQty),
    0
  );
  const totalParcelCharge = cart.reduce((sum, item) => {
    const charge =
      item.parcel_charge > 0 ? item.parcel_charge : universalParcelCharge;
    return sum + charge * item.takeawayQty;
  }, 0);
  const grandTotal = subtotal + totalParcelCharge;

  placeOrderBtn.disabled = true;
  placeOrderBtn.textContent = "Placing Order...";

  const { data: nextNumber, error: rpcError } = await anonDb.rpc(
    "get_next_daily_order_number",
    { rest_id: restaurantId }
  );

  if (rpcError) {
    console.error("Error fetching next order number:", rpcError);
    alert("Error placing order: Could not generate order number.");
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
    return;
  }

  const { data: orderData, error: insertError } = await anonDb
    .from("orders")
    .insert({
      customer_name: currentUser,
      total: grandTotal,
      items: cart,
      status: "Pending",
      daily_order_number: nextNumber,
      restaurant_id: restaurantId,
    });

  if (insertError) {
    console.error("Insert error:", insertError);
    alert("Error placing order: " + insertError.message);
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
    return;
  }

  document.querySelector(
    ".invoice-footer p"
  ).textContent = `Thank you for your order, ${currentUser}! Your order number is #${nextNumber}.`;
  document.getElementById("placeOrderBtn").classList.add("hidden");
  document.getElementById("modifyOrderBtn").classList.add("hidden");
  document.getElementById("cancelOrderBtn").classList.add("hidden");
  document.getElementById("newOrderBtn").classList.remove("hidden");

  placeOrderBtn.disabled = false;
  placeOrderBtn.textContent = "Place Order";

  cart = [];
  updateCartUI();
}

async function loadDataFromSupabase() {
  const { data: settings, error: settingsError } = await db
    .from("restaurants")
    .select("name, universal_parcel_charge, logo_url, display_preference")
    .eq("id", restaurantId)
    .single();

  if (settingsError) {
    console.error("Error fetching restaurant settings:", settingsError);
  } else if (settings) {
    updateRestaurantName(settings.name);
    universalParcelCharge = settings.universal_parcel_charge || 0;
  }

  db.channel("public:restaurants")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "restaurants",
        filter: `id=eq.${restaurantId}`,
      },
      (payload) => {
        updateRestaurantName(payload.new.name);
        universalParcelCharge = payload.new.universal_parcel_charge || 0;
        updateCartUI(); // Recalculate cart if default charge changes
        displayParcelChargeNote();
      }
    )
    .subscribe();

  const { data: items, error: itemsError } = await db
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId);
  if (itemsError) console.error("Error fetching menu items:", itemsError);
  else menuItems = items;

  const { data: categories, error: categoriesError } = await db
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId);
  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError);
  } else {
    availableCategories = categories;
  }

  displayParcelChargeNote();
  renderMenu();
  updateCartUI();
}

// Appearance Settings
function updateRestaurantName(name) {
  if (name) {
    document.querySelectorAll(".logo").forEach((logo) => {
      logo.textContent = `🍽️ ${name}`;
    });
  }
}

function displayParcelChargeNote() {
  const noteElement = document.getElementById("parcelChargeNote");
  const hasIndividualCharges = menuItems.some((item) => item.parcel_charge > 0);

  if (universalParcelCharge > 0 && !hasIndividualCharges) {
    noteElement.textContent = `Note: A parcel charge of ₹${universalParcelCharge} applies to takeaway items.`;
  } else if (universalParcelCharge > 0 && hasIndividualCharges) {
    noteElement.textContent = `Note: A parcel charge of ₹${universalParcelCharge} applies to takeaway items. For some items this charge may differ. For more info on this please contact our staff.`;
  } else if (universalParcelCharge === 0 && hasIndividualCharges) {
    noteElement.textContent =
      "Note: Parcel charges apply for some takeaway items.";
  } else {
    noteElement.textContent = "";
  }
}

init();
