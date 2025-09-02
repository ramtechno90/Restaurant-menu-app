// -- SUPABASE SETUP --
const SUPABASE_URL = "https://mdpmktdfszztukfgqwjq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcG1rdGRmc3p6dHVrZmdxd2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMDQ0MTksImV4cCI6MjA3MDY4MDQxOX0.NBlC_7cqv7WscIryrJEPpfpktP8YerbsHfKp8UbjqHU";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// -- END SUPABASE SETUP --

// App State
let menuItems = [];
let availableCategories = [];
let adminRestaurantId = null; // To store the admin's restaurant ID

// DOM Elements
const logoutBtn = document.getElementById("logoutBtn");
const manageMenuBtn = document.getElementById("manageMenuBtn");
const dashboardBtn = document.getElementById("dashboardBtn");
const adminView = document.getElementById("adminView");
const menuManagementView = document.getElementById("menuManagementView");
const adminLoginModal = document.getElementById("adminLoginModal");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const addItemBtn = document.getElementById("addItemBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveRestaurantNameBtn = document.getElementById("saveRestaurantNameBtn");
const restaurantNameInput = document.getElementById("restaurantNameInput");
const logoInput = document.getElementById("logoInput");
const saveLogoBtn = document.getElementById("saveLogoBtn");
const logoPreview = document.getElementById("logoPreview");
const saveDisplayPrefBtn = document.getElementById("saveDisplayPrefBtn");
const universalParcelChargeInput = document.getElementById(
  "universalParcelChargeInput"
);
const saveUniversalParcelChargeBtn = document.getElementById(
  "saveUniversalParcelChargeBtn"
);
const hamburgerBtn = document.getElementById("hamburgerBtn");
const navLinks = document.getElementById("navLinks");
const newItemNameInput = document.getElementById("newItemName");

// Initialize App
async function init() {
  await checkUserSession();
}

hamburgerBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // Prevent the document click listener from firing immediately
  navLinks.classList.toggle("active");
});

// Close navbar when clicking outside of it
document.addEventListener("click", (e) => {
  if (
    navLinks.classList.contains("active") &&
    !navLinks.contains(e.target) &&
    !hamburgerBtn.contains(e.target)
  ) {
    navLinks.classList.remove("active");
  }
});

async function checkUserSession() {
  const {
    data: { session },
  } = await db.auth.getSession();
  if (session) {
    // Find which restaurant this admin belongs to
    const { data, error } = await db
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", session.user.id)
      .single();

    if (error || !data) {
      alert("You are not assigned to a restaurant. Please contact support.");
      await db.auth.signOut();
      showLogin();
      return;
    }

    adminRestaurantId = data.restaurant_id;
    showDashboard();
    await loadDataFromSupabase();
    await renderAdminOrders(); // Initial fetch
    await loadRestaurantDetails();

    // 🔁 Refresh orders every 10s
    setInterval(async () => {
      await renderAdminOrders();
    }, 10000);
  } else {
    showLogin();
  }
}

// Navigation
dashboardBtn.addEventListener("click", () => {
  showDashboard();
  navLinks.classList.remove("active");
});
manageMenuBtn.addEventListener("click", () => {
  showMenuManagementView();
  navLinks.classList.remove("active");
});
logoutBtn.addEventListener("click", async () => {
  await db.auth.signOut();
  showLogin();
  navLinks.classList.remove("active");
});

function showLogin() {
  adminLoginModal.classList.remove("hidden");
  adminView.classList.add("hidden");
  menuManagementView.classList.add("hidden");
  dashboardBtn.classList.add("hidden");
  manageMenuBtn.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}

function showDashboard() {
  adminLoginModal.classList.add("hidden");
  adminView.classList.remove("hidden");
  menuManagementView.classList.add("hidden");
  dashboardBtn.classList.remove("hidden");
  manageMenuBtn.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  dashboardBtn.classList.add("btn-primary");
  dashboardBtn.classList.remove("btn-secondary");
  manageMenuBtn.classList.add("btn-secondary");
  manageMenuBtn.classList.remove("btn-primary");
}

function showMenuManagementView() {
  adminView.classList.add("hidden");
  menuManagementView.classList.remove("hidden");
  manageMenuBtn.classList.add("btn-primary");
  manageMenuBtn.classList.remove("btn-secondary");
  dashboardBtn.classList.add("btn-secondary");
  dashboardBtn.classList.remove("btn-primary");
  renderMenuItemsList();
  renderCategoryList();
}

// Admin Login
adminLoginBtn.addEventListener("click", async () => {
  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;
  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    alert("Error: " + error.message);
  } else {
    await init();
  }
});

// Admin Functions
let currentAdminTab = "pending";

document.querySelectorAll(".admin-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.tab;
    switchAdminTab(tabName);
  });
});

function switchAdminTab(tabName) {
  currentAdminTab = tabName;

  document
    .querySelectorAll(".admin-tab")
    .forEach((tab) => tab.classList.remove("active"));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

  document
    .querySelectorAll(".admin-section")
    .forEach((section) => section.classList.remove("active"));
  document.getElementById(`${tabName}Section`).classList.add("active");

  renderAdminOrders();
}

async function renderAdminOrders(orders) {
  if (!orders) {
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("restaurant_id", adminRestaurantId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching orders:", error);
      return;
    }
    orders = data;
  }

  const pendingOrders = orders.filter((order) => order.status === "Pending");
  const acceptedOrders = orders.filter((order) => order.status === "Accepted");
  const completedOrders = orders.filter(
    (order) => order.status === "Completed"
  );
  const rejectedOrders = orders.filter((order) => order.status === "Rejected");

  document.getElementById("pendingBadge").textContent = pendingOrders.length;
  document.getElementById("acceptedBadge").textContent = acceptedOrders.length;
  document.getElementById("completedBadge").textContent =
    completedOrders.length;
  document.getElementById("rejectedBadge").textContent = rejectedOrders.length;

  document.getElementById("pendingBadge").style.display =
    pendingOrders.length > 0 ? "flex" : "none";
  document.getElementById("acceptedBadge").style.display =
    acceptedOrders.length > 0 ? "flex" : "none";
  document.getElementById("completedBadge").style.display =
    completedOrders.length > 0 ? "flex" : "none";
  document.getElementById("rejectedBadge").style.display =
    rejectedOrders.length > 0 ? "flex" : "none";

  renderOrderSection("pending", pendingOrders);
  renderOrderSection("accepted", acceptedOrders);
  renderOrderSection("completed", completedOrders);
  renderOrderSection("rejected", rejectedOrders);
}

function renderOrderSection(status, ordersList) {
  const container = document.getElementById(`${status}Orders`);

  if (ordersList.length === 0) {
    container.innerHTML = `<p class="empty-state">No ${status} orders</p>`;
    return;
  }

  container.innerHTML = ordersList
    .map(
      (order) => `
        <div class="order-card">
            <div class="order-header">
                <div class="order-info">
                    <h4>Order #${order.daily_order_number}</h4>
                    <p>Customer: ${order.customer_name}</p>
                    <p style="font-size: 14px;">${new Date(
                      order.created_at
                    ).toLocaleString()}</p>
                </div>
                <div class="price-align">
                    <span class="order-status" style="background: ${getStatusColor(
                      order.status
                    )};">${order.status}</span>
                    <p class="order-total">₹${order.total.toFixed(2)}</p>
                </div>
            </div>
            <div class="order-items">
                ${order.items
                  .map((item) => {
                    const totalQty = item.dineInQty + item.takeawayQty;
                    let diningDetails = [];
                    if (item.dineInQty > 0)
                      diningDetails.push(
                        `<span class="order-icon">🍽️</span> ${item.dineInQty}`
                      );
                    if (item.takeawayQty > 0)
                      diningDetails.push(
                        `<span class="order-icon">📦</span> ${item.takeawayQty}`
                      );

                    return `
                    <div class="order-item">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <span style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span>${item.name}</span>
                                        <span style="color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 12px; font-size: 12px;">x${totalQty}</span>
                                    </div>
                                    <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                                        ${diningDetails.join(" • ")}
                                    </div>
                                    ${
                                      item.note && item.note.trim()
                                        ? `<div style="font-size: 11px; color: #ea580c; margin-top: 4px; font-weight: 500; background: #fef7ed; padding: 4px 8px; border-radius: 4px; border-left: 3px solid #ea580c;">📝 Special Instructions: ${item.note.trim()}</div>`
                                        : ""
                                    }
                                </div>
                            </span>
                        </div>
                    </div>
                    `;
                  })
                  .join("")}
            </div>
            ${getOrderActions(order)}
        </div>
    `
    )
    .join("");
}

function getStatusColor(status) {
  switch (status) {
    case "Pending":
      return "#fef3c7";
    case "Accepted":
      return "#dbeafe";
    case "Completed":
      return "#d1fae5";
    case "Rejected":
      return "#fee2e2";
    default:
      return "#f3f4f6";
  }
}

function getOrderActions(order) {
  let actions = "";
  switch (order.status) {
    case "Pending":
      actions = `
                <div class="order-actions">
                    <button onclick="updateOrderStatus(${order.id}, 'Accepted')" class="btn btn-success">Accept Order</button>
                    <button onclick="updateOrderStatus(${order.id}, 'Rejected')" class="btn btn-danger">Reject Order</button>
                </div>
            `;
      break;
    case "Accepted":
      actions = `
                <div class="order-actions">
                    <button onclick="updateOrderStatus(${order.id}, 'Completed')" class="btn btn-success">Complete Order</button>
                </div>
            `;
      break;
    case "Rejected":
      actions = `
              <div class="order-actions">
                  <button onclick="updateOrderStatus(${order.id}, 'Pending')" class="btn btn-secondary">Restore</button>
              </div>
          `;
      break;
    default:
      actions = "";
  }
  return actions;
}

window.updateOrderStatus = async function (orderId, newStatus) {
  const { error } = await db
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);
  if (error) {
    console.error("Error updating order status:", error);
    alert("Error updating order status: " + error.message);
  } else {
    await renderAdminOrders();
  }
};

function showInfoModal(title, message) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmMessage").textContent = message;
  document.getElementById("confirmModal").classList.remove("hidden");

  document.getElementById("confirmCancel").classList.add("hidden");
  const confirmBtn = document.getElementById("confirmProceed");
  confirmBtn.textContent = "OK";
  confirmBtn.classList.remove("btn-danger");
  confirmBtn.classList.add("btn-primary");

  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener("click", () => {
    document.getElementById("confirmModal").classList.add("hidden");
    document.getElementById("confirmCancel").classList.remove("hidden");
    newConfirmBtn.textContent = "Confirm";
    newConfirmBtn.classList.add("btn-danger");
    newConfirmBtn.classList.remove("btn-primary");
  });
}

window.clearCompleted = async function () {
  const { data, error } = await db
    .from("orders")
    .delete()
    .eq("status", "Completed");
  if (error) {
    console.error("Error clearing completed orders:", error);
  } else {
    showInfoModal("Success! ✅", "Completed orders cleared successfully!");
    await renderAdminOrders();
  }
};

window.clearRejected = async function () {
  const { data, error } = await db
    .from("orders")
    .delete()
    .eq("status", "Rejected");
  if (error) {
    console.error("Error clearing rejected orders:", error);
  } else {
    showInfoModal("Success! ✅", "Rejected orders cleared successfully!");
    await renderAdminOrders();
  }
};

// Menu Management Functions
function renderMenuItemsList() {
  const menuItemsList = document.getElementById("menuItemsList");

  if (menuItems.length === 0) {
    menuItemsList.innerHTML = '<p class="empty-state">No menu items</p>';
    return;
  }

  const categories = {};
  menuItems.forEach((item) => {
    if (!categories[item.category]) {
      categories[item.category] = [];
    }
    categories[item.category].push(item);
  });

  const categoryOrder = availableCategories.map((c) => c.name);

  let html = "";

  categoryOrder.forEach((categoryName) => {
    if (categories[categoryName]) {
      html += renderCategorySectionForAdmin(
        categoryName,
        categories[categoryName]
      );
    }
  });

  Object.keys(categories).forEach((categoryName) => {
    if (!categoryOrder.includes(categoryName)) {
      html += renderCategorySectionForAdmin(
        categoryName,
        categories[categoryName]
      );
    }
  });

  menuItemsList.innerHTML = html;

  setTimeout(() => {
    applyExpandedState();
  }, 10);
}

function renderCategorySectionForAdmin(categoryName, items) {
  const inStockItems = items.filter((item) => item.in_stock);
  const outOfStockItems = items.filter((item) => !item.in_stock);

  const inStockTakeawayAvailable = inStockItems.filter(
    (item) => item.takeaway_available
  );
  const inStockTakeawayNotAvailable = inStockItems.filter(
    (item) => !item.takeaway_available
  );

  return `
        <div style="margin-bottom: 32px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background: #f9fafb; padding: 16px; border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="toggleMenuSection('category-${categoryName}')">
                <h3 style="font-size: 20px; font-weight: bold; color: #1f2937; margin: 0; display: flex; justify-content: space-between; align-items: center;">
                    ${categoryName} (${items.length} items)
                    <span class="category-arrow" id="arrow-category-${categoryName}" style="transform: rotate(-90deg); transition: transform 0.3s ease;">▼</span>
                </h3>
            </div>
            
            <div id="content-category-${categoryName}" style="padding: 16px; max-height: 0; opacity: 0; overflow: hidden; transition: all 0.3s ease;">
                ${
                  inStockItems.length > 0
                    ? `
                    <div style="margin-bottom: 24px;">
                        <div style="cursor: pointer;" onclick="toggleMenuSection('instock-${categoryName}')">
                            <h4 style="font-size: 17px; font-weight: 700; color: #065f46; margin-bottom: 16px; padding: 12px 18px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; display: inline-flex; align-items: center; gap: 12px; box-shadow: 0 3px 6px rgba(6, 95, 70, 0.15); border: 1px solid #6ee7b7; transition: all 0.3s ease;" onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 5px 10px rgba(6, 95, 70, 0.25)'" onmouseout="this.style.transform='translateX(0px)'; this.style.boxShadow='0 3px 6px rgba(6, 95, 70, 0.15)'">
                                ✅ In Stock (${inStockItems.length})
                                <span class="category-arrow" id="arrow-instock-${categoryName}" style="transform: rotate(-90deg); transition: transform 0.3s ease; font-size: 14px; color: #065f46;">▼</span>
                            </h4>
                        </div>
                        
                        <div id="content-instock-${categoryName}" style="max-height: 0; opacity: 0; overflow: hidden; transition: all 0.3s ease;">
                            ${
                              inStockTakeawayAvailable.length > 0
                                ? `
                                <div style="margin-bottom: 20px; margin-left: 16px;">
                                    <div style="cursor: pointer;" onclick="toggleMenuSection('takeaway-available-${categoryName}')">
                                        <h5 style="font-size: 15px; font-weight: 700; color: #1e40af; margin-bottom: 12px; padding: 10px 16px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 10px; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 2px 4px rgba(30, 64, 175, 0.1); border: 1px solid #93c5fd; transition: all 0.3s ease;" onmouseover="this.style.transform='translateX(3px)'; this.style.boxShadow='0 4px 8px rgba(30, 64, 175, 0.2)'" onmouseout="this.style.transform='translateX(0px)'; this.style.boxShadow='0 2px 4px rgba(30, 64, 175, 0.1)'">
                                            <span class="order-icon">📦</span> Takeaway Available (${
                                              inStockTakeawayAvailable.length
                                            })
                                            <span class="category-arrow" id="arrow-takeaway-available-${categoryName}" style="transform: rotate(-90deg); transition: transform 0.3s ease; font-size: 12px; color: #1e40af;">▼</span>
                                        </h5>
                                    </div>
                                    <div id="content-takeaway-available-${categoryName}" style="margin-left: 16px; max-height: 0; opacity: 0; overflow: hidden; transition: all 0.3s ease;">
                                        <div style="display: grid; gap: 12px;">
                                            ${inStockTakeawayAvailable
                                              .map((item) =>
                                                renderMenuItemForAdmin(item)
                                              )
                                              .join("")}
                                        </div>
                                    </div>
                                </div>
                            `
                                : ""
                            }
                            
                            ${
                              inStockTakeawayNotAvailable.length > 0
                                ? `
                                <div style="margin-bottom: 20px; margin-left: 16px;">
                                    <div style="cursor: pointer;" onclick="toggleMenuSection('takeaway-not-available-${categoryName}')">
                                        <h5 style="font-size: 15px; font-weight: 700; color: #92400e; margin-bottom: 12px; padding: 10px 16px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 2px 4px rgba(146, 64, 14, 0.1); border: 1px solid #fbbf24; transition: all 0.3s ease;" onmouseover="this.style.transform='translateX(3px)'; this.style.boxShadow='0 4px 8px rgba(146, 64, 14, 0.2)'" onmouseout="this.style.transform='translateX(0px)'; this.style.boxShadow='0 2px 4px rgba(146, 64, 14, 0.1)'">
                                            <span class="order-icon">🍽️</span> Dine-in Only (${
                                              inStockTakeawayNotAvailable.length
                                            })
                                            <span class="category-arrow" id="arrow-takeaway-not-available-${categoryName}" style="transform: rotate(-90deg); transition: transform 0.3s ease; font-size: 12px; color: #92400e;">▼</span>
                                        </h5>
                                    </div>
                                    <div id="content-takeaway-not-available-${categoryName}" style="margin-left: 16px; max-height: 0; opacity: 0; overflow: hidden; transition: all 0.3s ease;">
                                        <div style="display: grid; gap: 12px;">
                                            ${inStockTakeawayNotAvailable
                                              .map((item) =>
                                                renderMenuItemForAdmin(item)
                                              )
                                              .join("")}
                                        </div>
                                    </div>
                                </div>
                            `
                                : ""
                            }
                        </div>
                    </div>
                `
                    : ""
                }
                
                ${
                  outOfStockItems.length > 0
                    ? `
                    <div>
                        <div style="cursor: pointer;" onclick="toggleMenuSection('outofstock-${categoryName}')">
                            <h4 style="font-size: 17px; font-weight: 700; color: #991b1b; margin-bottom: 16px; padding: 12px 18px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 12px; display: inline-flex; align-items: center; gap: 12px; box-shadow: 0 3px 6px rgba(153, 27, 27, 0.15); border: 1px solid #f87171; transition: all 0.3s ease;" onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 5px 10px rgba(153, 27, 27, 0.25)'" onmouseout="this.style.transform='translateX(0px)'; this.style.boxShadow='0 3px 6px rgba(153, 27, 27, 0.15)'">
                                ❌ Out of Stock (${outOfStockItems.length})
                                <span class="category-arrow" id="arrow-outofstock-${categoryName}" style="transform: rotate(-90deg); transition: transform 0.3s ease; font-size: 14px; color: #991b1b;">▼</span>
                            </h4>
                        </div>
                        <div id="content-outofstock-${categoryName}" style="max-height: 0; opacity: 0; overflow: hidden; transition: all 0.3s ease;">
                            <div style="display: grid; gap: 12px; margin-left: 16px;">
                                ${outOfStockItems
                                  .map((item) => renderMenuItemForAdmin(item))
                                  .join("")}
                            </div>
                        </div>
                    </div>
                `
                    : ""
                }
                
                ${
                  items.length === 0
                    ? '<p style="color: #6b7280; text-align: center; padding: 20px;">No items in this category</p>'
                    : ""
                }
            </div>
        </div>
    `;
}

function renderMenuItemForAdmin(item) {
  return `
        <div class="menu-card" style="margin-bottom: 0;">
            <div class="menu-card-content" style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <h3 class="menu-name" style="margin-bottom: 4px; font-size: 18px;">${
                      item.name
                    }</h3>
                    <span class="menu-price">₹${item.price}</span>
                </div>
                 <p class="menu-description" style="margin-bottom: 4px; font-size: 14px; color: #1e40af;">Parcel Charge: ₹${
                   item.parcel_charge || 0
                 }</p>
                <p class="menu-description" style="margin-bottom: 12px; font-size: 14px; line-height: 1.4;">${
                  item.description
                }</p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button onclick="toggleStock(${item.id})" class="btn ${
    item.in_stock ? "btn-danger" : "btn-success"
  }" style="font-size: 12px; padding: 6px 12px;">
                            ${
                              item.in_stock
                                ? "Mark Out of Stock"
                                : "Mark In Stock"
                            }
                        </button>
                        <button onclick="toggleTakeaway(${
                          item.id
                        })" class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;">
                            ${
                              item.takeaway_available
                                ? "Disable Takeaway"
                                : "Enable Takeaway"
                            }
                        </button>
                    </div>
                    
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editMenuItem(${
                          item.id
                        })" class="btn" style="font-size: 12px; padding: 6px 12px; background: #3b82f6; color: white;">Edit</button>
                        <button onclick="deleteMenuItem(${
                          item.id
                        })" class="btn" style="font-size: 12px; padding: 6px 12px; background: #dc2626; color: white;">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function addOrUpdateItem() {
  const name = document.getElementById("newItemName").value.trim();
  const price = parseFloat(document.getElementById("newItemPrice").value);
  const parcelCharge =
    parseFloat(document.getElementById("newItemParcelCharge").value) || 0;
  const category = document.getElementById("newItemCategory").value;
  const description = document
    .getElementById("newItemDescription")
    .value.trim();
  const id = document.getElementById("editItemId").value;

  if (!name || !price || !category) {
    alert("Please fill in all required fields (name, price, category)");
    return;
  }

  const itemData = {
    name,
    price,
    parcel_charge: parcelCharge,
    category,
    description,
    restaurant_id: adminRestaurantId,
  };
  let error;

  if (id) {
    // Update existing item
    const { error: updateError } = await db
      .from("menu_items")
      .update(itemData)
      .eq("id", id);
    error = updateError;
  } else {
    // Insert new item
    const { error: insertError } = await db
      .from("menu_items")
      .insert({ ...itemData, in_stock: true, takeaway_available: true });
    error = insertError;
  }

  if (error) {
    alert("Error saving item: " + error.message);
  } else {
    showInfoModal(
      "Success! ✅",
      `Item ${id ? "updated" : "added"} successfully!`
    );
    resetItemForm();
    await loadDataFromSupabase();
    renderMenuItemsList();
  }
}

async function addNewCategory() {
  const categoryName = document.getElementById("newCategoryName").value.trim();

  if (!categoryName) {
    return;
  }

  if (availableCategories.some((c) => c.name === categoryName)) {
    alert("Category already exists");
    return;
  }

  const { error } = await db
    .from("categories")
    .insert({ name: categoryName, restaurant_id: adminRestaurantId });

  if (error) {
    alert("Error adding category: " + error.message);
  } else {
    document.getElementById("newCategoryName").value = "";
    await loadDataFromSupabase();
    updateCategoryDropdown();
    renderCategoryList();
  }
}

window.deleteMenuItem = async function (itemId) {
  showConfirmationModal(
    "Are you sure you want to delete this item?",
    async () => {
      const { error } = await db.from("menu_items").delete().eq("id", itemId);
      if (error) {
        alert("Error deleting item: " + error.message);
      } else {
        await loadDataFromSupabase();
        renderMenuItemsList();
      }
    }
  );
};

window.editMenuItem = function (itemId) {
  const item = menuItems.find((i) => i.id === itemId);
  if (item) {
    document.getElementById("formTitle").textContent = "Edit Item";
    document.getElementById("editItemId").value = item.id;
    document.getElementById("newItemName").value = item.name;
    document.getElementById("newItemPrice").value = item.price;
    document.getElementById("newItemParcelCharge").value =
      item.parcel_charge || 0;
    document.getElementById("newItemCategory").value = item.category;
    document.getElementById("newItemDescription").value = item.description;

    addItemBtn.textContent = "Update Item";
    cancelEditBtn.classList.remove("hidden");

    // Collapse other sections and expand the add item section
    setManagementSectionExpanded("restaurantSettings", false);
    setManagementSectionExpanded("categoryManagement", false);
    setManagementSectionExpanded("addItem", true);

    newItemNameInput.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

function resetItemForm() {
  document.getElementById("formTitle").textContent = "Add New Item";
  document.getElementById("editItemId").value = "";
  document.getElementById("newItemName").value = "";
  document.getElementById("newItemPrice").value = "";
  document.getElementById("newItemParcelCharge").value = "";
  document.getElementById("newItemCategory").value = "";
  document.getElementById("newItemDescription").value = "";

  addItemBtn.textContent = "Add Item";
  cancelEditBtn.classList.add("hidden");
}

window.toggleStock = async function (itemId) {
  const item = menuItems.find((i) => i.id === itemId);
  if (item) {
    const { error } = await db
      .from("menu_items")
      .update({ in_stock: !item.in_stock })
      .eq("id", itemId);
    if (error) {
      alert("Error updating stock status: " + error.message);
    } else {
      await loadDataFromSupabase();
      renderMenuItemsList();
    }
  }
};

window.toggleTakeaway = async function (itemId) {
  const item = menuItems.find((i) => i.id === itemId);
  if (item) {
    const { error } = await db
      .from("menu_items")
      .update({ takeaway_available: !item.takeaway_available })
      .eq("id", itemId);
    if (error) {
      alert("Error updating takeaway status: " + error.message);
    } else {
      await loadDataFromSupabase();
      renderMenuItemsList();
    }
  }
};

addItemBtn.addEventListener("click", addOrUpdateItem);
cancelEditBtn.addEventListener("click", resetItemForm);
document
  .getElementById("addNewCategory")
  .addEventListener("click", addNewCategory);

document
  .getElementById("clearCompletedBtn")
  .addEventListener("click", clearCompleted);
document
  .getElementById("clearRejectedBtn")
  .addEventListener("click", clearRejected);

let expandedSections = new Set();
let expandedManagementSections = new Set(["addItem"]);

window.toggleManagementSection = function (sectionId) {
  setManagementSectionExpanded(
    sectionId,
    !expandedManagementSections.has(sectionId)
  );
};

function setManagementSectionExpanded(sectionId, isExpanded) {
  const content = document.getElementById(`${sectionId}Content`);
  const arrow = document.getElementById(`${sectionId}Arrow`);

  if (!content || !arrow) return;

  if (isExpanded) {
    content.classList.remove("category-collapsed");
    content.classList.add("category-expanded");
    arrow.style.transform = "rotate(0deg)";
    expandedManagementSections.add(sectionId);
  } else {
    content.classList.add("category-collapsed");
    content.classList.remove("category-expanded");
    arrow.style.transform = "rotate(-90deg)";
    expandedManagementSections.delete(sectionId);
  }
}

window.toggleMenuSection = function (sectionId) {
  const content = document.getElementById(`content-${sectionId}`);
  const arrow = document.getElementById(`arrow-${sectionId}`);

  if (!content || !arrow) return;

  if (expandedSections.has(sectionId)) {
    content.style.maxHeight = "0px";
    content.style.opacity = "0";
    arrow.style.transform = "rotate(-90deg)";
    expandedSections.delete(sectionId);
  } else {
    content.style.maxHeight = "2000px";
    content.style.opacity = "1";
    arrow.style.transform = "rotate(0deg)";
    expandedSections.add(sectionId);
  }
};

function applyExpandedState() {
  expandedSections.forEach((sectionId) => {
    const content = document.getElementById(`content-${sectionId}`);
    const arrow = document.getElementById(`arrow-${sectionId}`);

    if (content && arrow) {
      content.style.maxHeight = "2000px";
      content.style.opacity = "1";
      arrow.style.transform = "rotate(0deg)";
    }
  });
}

async function loadDataFromSupabase() {
  const { data: items, error: itemsError } = await db
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", adminRestaurantId);
  if (itemsError) console.error("Error fetching menu items:", itemsError);
  else menuItems = items;

  const { data: categories, error: categoriesError } = await db
    .from("categories")
    .select("*")
    .eq("restaurant_id", adminRestaurantId);
  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError);
  } else {
    availableCategories = categories;
  }

  updateCategoryDropdown();
}

function updateCategoryDropdown() {
  const categorySelect = document.getElementById("newItemCategory");
  if (!categorySelect) {
    console.error("Could not find the category dropdown element!");
    return;
  }

  categorySelect.innerHTML = '<option value="">Select category</option>';

  availableCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = category.name;
    categorySelect.appendChild(option);
  });
}

// Appearance Settings
async function loadRestaurantDetails() {
  const { data, error } = await db
    .from("restaurants")
    .select("name, universal_parcel_charge, logo_url, display_preference")
    .eq("id", adminRestaurantId)
    .single();
  if (error) {
    console.error("Error fetching restaurant details:", error);
  } else if (data) {
    restaurantNameInput.value = data.name;
    universalParcelChargeInput.value = data.universal_parcel_charge || 0;
    updateRestaurantName(data.name);
  }
}

function updateRestaurantName(name) {
  if (name) {
    document.querySelectorAll(".logo").forEach((logo) => {
      logo.textContent = `🍽️ ${name} - Admin`;
    });
  }
}

saveRestaurantNameBtn.addEventListener("click", async () => {
  const newName = restaurantNameInput.value.trim();
  if (!newName) {
    alert("Restaurant name cannot be empty.");
    return;
  }
  if (adminRestaurantId) {
    const { error } = await db
      .from("restaurants")
      .update({ name: newName })
      .eq("id", adminRestaurantId);
    if (error) {
      alert("Error updating restaurant name: " + error.message);
    } else {
      loadRestaurantDetails();
      alert("Restaurant name updated successfully!");
    }
  }
});

saveUniversalParcelChargeBtn.addEventListener("click", async () => {
  const newCharge = parseFloat(universalParcelChargeInput.value) || 0;
  if (adminRestaurantId) {
    const { error } = await db
      .from("restaurants")
      .update({ universal_parcel_charge: newCharge })
      .eq("id", adminRestaurantId);
    if (error) {
      alert("Error updating parcel charge: " + error.message);
    } else {
      alert("Default parcel charge updated successfully!");
    }
  }
});

// Real-time subscriptions
db.channel("public:orders")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "orders" },
    (payload) => {
      console.log("Change received!", payload);
      renderAdminOrders();
    }
  )
  .subscribe();

db.channel("public:menu_items")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "menu_items" },
    async (payload) => {
      console.log("Menu change received!", payload);
      await loadDataFromSupabase();
      if (menuManagementView.classList.contains("hidden") === false) {
        renderMenuItemsList();
      }
    }
  )
  .subscribe();

db.channel("public:categories")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "categories" },
    async (payload) => {
      console.log("Category change received!", payload);
      await loadDataFromSupabase();
      updateCategoryDropdown();
      renderCategoryList();
    }
  )
  .subscribe();

// Category Management
function renderCategoryList() {
  const categoryList = document.getElementById("categoryList");
  categoryList.innerHTML = "";
  availableCategories.forEach((category) => {
    const categoryItem = document.createElement("div");
    categoryItem.className = "category-list-item";
    categoryItem.innerHTML = `
            <span>${category.name}</span>
            <div>
                <button class="btn btn-secondary" onclick="renameCategory(${category.id}, '${category.name}')">Rename</button>
                <button class="btn btn-danger" onclick="deleteCategory(${category.id}, '${category.name}')">Delete</button>
            </div>
        `;
    categoryList.appendChild(categoryItem);
  });
}

window.renameCategory = async function (categoryId, oldName) {
  const newName = prompt(`Enter new name for category "${oldName}":`);
  if (newName && newName.trim() !== "") {
    const { error } = await db
      .from("categories")
      .update({ name: newName.trim() })
      .eq("id", categoryId);
    if (error) {
      alert("Error renaming category: " + error.message);
    } else {
      const { error: updateError } = await db
        .from("menu_items")
        .update({ category: newName.trim() })
        .eq("category", oldName);
      if (updateError) {
        alert("Error updating menu items: " + updateError.message);
      } else {
        await loadDataFromSupabase();
        renderCategoryList();
        renderMenuItemsList();
      }
    }
  }
};

window.deleteCategory = async function (categoryId, categoryName) {
  const { data, error } = await db
    .from("menu_items")
    .select("id")
    .eq("category", categoryName);

  if (error) {
    alert("Error checking for items in category: " + error.message);
    return;
  }

  let confirmMessage = `Are you sure you want to delete the category "${categoryName}"?`;
  if (data.length > 0) {
    confirmMessage = `The category "${categoryName}" contains ${data.length} item(s). Are you sure you want to delete this category and all of its items?`;
  }

  showConfirmationModal(confirmMessage, async () => {
    const { error: deleteItemsError } = await db
      .from("menu_items")
      .delete()
      .eq("category", categoryName);
    if (deleteItemsError) {
      alert("Error deleting items in category: " + deleteItemsError.message);
      return;
    }

    const { error: deleteCategoryError } = await db
      .from("categories")
      .delete()
      .eq("id", categoryId);
    if (deleteCategoryError) {
      alert("Error deleting category: " + deleteCategoryError.message);
    } else {
      await loadDataFromSupabase();
      renderCategoryList();
      renderMenuItemsList();
    }
  });
};

function showConfirmationModal(message, onConfirm) {
  const confirmModal = document.getElementById("confirmModal");
  const confirmMessage = document.getElementById("confirmMessage");
  const confirmProceed = document.getElementById("confirmProceed");
  const confirmCancel = document.getElementById("confirmCancel");

  confirmMessage.textContent = message;
  confirmModal.classList.remove("hidden");

  const newConfirmBtn = confirmProceed.cloneNode(true);
  confirmProceed.parentNode.replaceChild(newConfirmBtn, confirmProceed);

  newConfirmBtn.addEventListener("click", () => {
    onConfirm();
    confirmModal.classList.add("hidden");
  });

  confirmCancel.onclick = () => {
    confirmModal.classList.add("hidden");
  };
}

init();
