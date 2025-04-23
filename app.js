import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  remove,
  update
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkOqI2wsFZhbyf5yLa-xt_iaHWcvnMn9E",
  authDomain: "secproject-939ea.firebaseapp.com",
  databaseURL: "https://secproject-939ea-default-rtdb.firebaseio.com",
  projectId: "secproject-939ea",
  storageBucket: "secproject-939ea.appspot.com", // ← fixed
  messagingSenderId: "653409216609",
  appId: "1:653409216609:web:2dac0d1485ba20b4a4a220",
  measurementId: "G-L8X8KLSTJN"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Make functions accessible globally if needed
window.addDish = addDish;
window.saveDishChanges = saveDishChanges;


// Sign Up
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("s-name").value;
    const email = document.getElementById("s-email").value;
    const password = document.getElementById("s-pass").value;
    const confirmPassword = document.getElementById("s-cpass").value;

    if (password !== confirmPassword) {
      document.getElementById("error-message").textContent = "Passwords do not match.";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await set(ref(database, `users/${userCredential.user.uid}`), {
        name,
        email,
        role: 'admin'
      });
      Swal.fire("Account Created", "Your admin account has been created.", "success")
        .then(() => window.location.href = "admin login.html");
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  });
}

// Login
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("l-email").value;
    const password = document.getElementById("l-pass").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      Swal.fire("Login Successful", "Redirecting to dashboard...", "success")
        .then(() => window.location.href = "dashboard.html");
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  });
}

// Logout
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      Swal.fire("Logged Out", "Redirecting to login...", "success")
        .then(() => window.location.href = "admin login.html");
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  });
}

// Dashboard Auth Check
let authUnsubscribe = null;
let dashboardInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
  authUnsubscribe = onAuthStateChanged(auth, (user) => {
    if (!user) {
      if (window.location.pathname.includes("dashboard")) {
        window.location.href = "admin login.html";
      }
    } else {
      initializeDashboard(user);
    }
  });
});

window.addEventListener("beforeunload", () => {
  if (authUnsubscribe) authUnsubscribe();
});

function initializeDashboard(user) {
  if (dashboardInitialized) return;
  dashboardInitialized = true;

  const userRef = ref(database, `users/${user.uid}`);
  onValue(userRef, (snapshot) => {
    const userData = snapshot.val();
    console.log("User data:", userData);
    if (userData) {
      const nameElem = document.getElementById("admin-name");
      const emailElem = document.getElementById("admin-email");

      if (nameElem && emailElem) {
        nameElem.textContent = userData.name;
        emailElem.textContent = userData.email;
      } else {
        console.warn("admin-name or admin-email elements not found.");
      }
    }
  });

  initializeCharts();
  loadMenuItems();
  setupEventListeners();
}

function setupEventListeners() {
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
      this.classList.add('active');

      const target = this.getAttribute('href');
      document.getElementById("dashboard-section").style.display = target === '#dashboard' ? 'block' : 'none';
      document.getElementById("restaurants-section").style.display = target === '#restaurants' ? 'block' : 'none';
    });
  });

  document.getElementById("addDishForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    addDish();
  });

  document.getElementById("editDishForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveDishChanges();
  });
}

function loadMenuItems() {
  const menuItemsRef = ref(database, 'menuItems');
  onValue(menuItemsRef, (snapshot) => {
    const items = snapshot.val();
    const container = document.getElementById("menu-items-container");
    container.innerHTML = '';

    if (items) {
      Object.entries(items).forEach(([id, item]) => {
        container.appendChild(createMenuItemCard(id, item));
      });
    } else {
      container.innerHTML = '<div class="col-12 text-center py-5">No menu items found.</div>';
    }
  });
}

function createMenuItemCard(id, item) {
  const col = document.createElement("div");
  col.className = "col-md-6 col-lg-4 col-xl-3 mb-4";

  // Handle missing or invalid image URLs
  let imageSrc = item.imageUrl || '';
  
  // Validate URL format
  if (!imageSrc.startsWith('http') && !imageSrc.startsWith('data:image')) {
    console.warn(`Invalid image URL for item ${id}: ${imageSrc}`);
    imageSrc = 'https://via.placeholder.com/300x180?text=No+Image'; // Fallback placeholder
  }

  col.innerHTML = `
    <div class="card h-100">
      <img src="${imageSrc}" 
           class="card-img-top" 
           alt="${item.name || 'Menu item'}" 
           style="height:180px; object-fit:cover;"
           onerror="this.onerror=null;this.src='https://via.placeholder.com/300x180?text=Image+Error'">
      <div class="card-body">
        <h5 class="card-title">${item.name || 'Unnamed Item'}</h5>
        <p class="card-text">${item.description || ''}</p>
        <p><strong>$${(item.price || 0).toFixed(2)}</strong></p>
        <button class="btn btn-primary btn-edit" data-id="${id}">Edit</button>
        <button class="btn btn-danger btn-delete" data-id="${id}">Delete</button>
      </div>
    </div>
  `;

  col.querySelector('.btn-edit').addEventListener("click", () => openEditModal(id, item));
  col.querySelector('.btn-delete').addEventListener("click", () => deleteMenuItem(id));

  return col;
}

function addDish() {
  const name = document.getElementById("dishName").value.trim();
  const price = parseFloat(document.getElementById("dishPrice").value);
  const description = document.getElementById("dishDescription").value.trim();
  let imageUrl = document.getElementById("dishImage").value.trim();

  if (!name || isNaN(price)) {
    return Swal.fire("Error", "Please enter a valid name and price", "error");
  }

  // Validate image URL
  if (imageUrl && !imageUrl.match(/^(http|https|data:image)/)) {
    return Swal.fire("Error", "Please enter a valid image URL starting with http://, https://, or data:image", "error");
  }

  // Set default image if none provided
  if (!imageUrl) {
    imageUrl = "https://via.placeholder.com/300x180?text=No+Image";
  }

  const newDish = {
    name,
    price,
    description,
    imageUrl,
    createdAt: new Date().toISOString()
  };

  const newDishRef = push(ref(database, 'menuItems'));
  set(newDishRef, newDish).then(() => {
    Swal.fire("Success", "Dish added", "success");
    const form = document.getElementById("addDishForm");
    if (form && typeof form.reset === 'function') {
      form.reset();
    }
    const modal = bootstrap.Modal.getInstance(document.getElementById("addDishModal"));
    if (modal) modal.hide();
  });
}

function openEditModal(id, item) {
  document.getElementById("editDishId").value = id;
  document.getElementById("editDishName").value = item.name;
  document.getElementById("editDishPrice").value = item.price;
  document.getElementById("editDishDescription").value = item.description;
  document.getElementById("editDishImage").value = item.imageUrl;

  const editModal = new bootstrap.Modal(document.getElementById('editDishModal'));
  editModal.show();
}

function saveDishChanges() {
  const id = document.getElementById("editDishId").value;
  const name = document.getElementById("editDishName").value.trim();
  const price = parseFloat(document.getElementById("editDishPrice").value);
  const description = document.getElementById("editDishDescription").value.trim();
  const imageUrl = document.getElementById("editDishImage").value.trim();

  if (!name || isNaN(price)) {
    return Swal.fire("Error", "Please enter valid name and price", "error");
  }

  update(ref(database, `menuItems/${id}`), {
    name,
    price,
    description,
    imageUrl,
    updatedAt: new Date().toISOString()
  }).then(() => {
    Swal.fire("Success", "Dish updated", "success");
    bootstrap.Modal.getInstance(document.getElementById("editDishModal")).hide();
  });
}

function deleteMenuItem(id) {
  Swal.fire({
    title: "Are you sure?",
    text: "This action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it!"
  }).then((result) => {
    if (result.isConfirmed) {
      remove(ref(database, `menuItems/${id}`)).then(() => {
        Swal.fire("Deleted!", "Your dish has been removed.", "success");
      });
    }
  });
}

function initializeCharts() {
  const ordersChart = document.getElementById("ordersChart");
  if (ordersChart) {
    new Chart(ordersChart.getContext("2d"), {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{
          label: "Orders",
          data: [12, 19, 15, 20, 25, 30, 27],
          borderColor: "#d70f64",
          backgroundColor: "rgba(215, 15, 100, 0.1)",
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  const statusChart = document.getElementById("statusChart");
  if (statusChart) {
    new Chart(statusChart.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Delivered", "Pending", "Cancelled"],
        datasets: [{
          data: [60, 30, 10],
          backgroundColor: ["#4caf50", "#ffc107", "#f44336"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        cutout: "70%"
      }
    });
  }
}
