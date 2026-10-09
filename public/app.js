const translations = {
  es: {
    tagline: "HECHO A TU GUSTO",
    pickup: "Ordena aquí · Recoge por número",
    welcome: "BIENVENIDO A TU TAQUERÍA",
    headline1: "Un buen taco.",
    headline2: "Justo como te gusta.",
    intro: "Tu antojo empieza aquí.",
    start: "Iniciar orden",
    build: "ARMA TU PEDIDO",
    retry: "Reintentar cargar menú",
    yourOrder: "Tu orden",
    tax: "USD · Impuestos no incluidos",
    nameLabel: "¿A qué nombre va tu orden?",
    namePlaceholder: "Tu nombre",
    order: "Ordenar →",
    received: "¡PEDIDO RECIBIDO!",
    orderNumber: "Tu número de orden es",
    collect: "Recoge tu pedido cuando te llamemos.",
    newOrder: "Nuevo pedido",
    clearNotice: "Esta pantalla se limpiará en 25 segundos.",
    footer: "Taquería El Primo · Preparado al momento",
    categories: "Categorías",
    chooseCategory: "Elige una categoría para ver sus productos.",
    chooseProducts: "Elige tus productos y personalízalos a tu gusto.",
    backCategories: "← Categorías",
    backHome: "← Inicio",
    viewProducts: "Ver productos →",
    loading: "Cargando menú…",
    loadError:
      "No se pudo cargar el menú. Revisa la conexión y vuelve a intentar.",
    options: "Elige tus complementos",
    free: "Gratis",
    quantity: "Cantidad",
    add: "Agregar a mi orden +",
    soon: "Próximamente",
    emptyCategory:
      "Aún no hay productos disponibles en esta categoría. Puedes seguir explorando las demás.",
    discard: "¿Volver al inicio y borrar este pedido sin enviar?",
    noOptions: "Sin complementos",
    remove: "Quitar",
    emptyCart: "Tu próxima orden empieza con un taco.",
    needName: "Escribe tu nombre para continuar.",
    saving: "Guardando tu orden…",
    thanks: "¡Gracias, {name}!",
    submitError:
      "No se pudo confirmar. Revisa la conexión y vuelve a intentar.",
    unavailable:
      "Un producto u opción ya no está disponible. Revisa el menú antes de ordenar.",
  },
  en: {
    tagline: "MADE YOUR WAY",
    pickup: "Order here · Pick up by order number",
    welcome: "WELCOME TO YOUR TAQUERIA",
    headline1: "A great taco.",
    headline2: "Just the way you like it.",
    intro: "Your next craving starts here.",
    start: "Start order",
    build: "BUILD YOUR ORDER",
    retry: "Retry loading menu",
    yourOrder: "Your order",
    tax: "USD · Tax not included",
    nameLabel: "What name is the order for?",
    namePlaceholder: "Your name",
    order: "Place order →",
    received: "ORDER RECEIVED!",
    orderNumber: "Your order number is",
    collect: "Pick up your order when we call you.",
    newOrder: "New order",
    clearNotice: "This screen will reset in 25 seconds.",
    footer: "Taquería El Primo · Made fresh",
    categories: "Categories",
    chooseCategory: "Choose a category to see its items.",
    chooseProducts: "Choose your items and make them your own.",
    backCategories: "← Categories",
    backHome: "← Home",
    viewProducts: "View items →",
    loading: "Loading menu…",
    loadError: "Could not load the menu. Check your connection and try again.",
    options: "Choose your toppings",
    free: "Free",
    quantity: "Quantity",
    add: "Add to my order +",
    soon: "Coming soon",
    emptyCategory:
      "There are no items available in this category yet. Explore the other categories.",
    discard: "Go back home and discard this unsubmitted order?",
    noOptions: "No toppings",
    remove: "Remove",
    emptyCart: "Your next order starts with a taco.",
    needName: "Enter your name to continue.",
    saving: "Saving your order…",
    thanks: "Thank you, {name}!",
    submitError:
      "Could not confirm your order. Check your connection and try again.",
    unavailable:
      "An item or option is no longer available. Review the menu before ordering.",
  },
};
let language = "es";
const t = (key) => translations[language][key];
const menuEnglish = {
  tacos: "Tacos",
  tortas: "Tortas",
  burritos: "Burritos",
  "fin de semana": "Weekend specials",
  quesadillas: "Quesadillas",
  "taco asada": "Asada taco",
  cebolla: "Onion",
  cilantro: "Cilantro",
  aguacate: "Avocado",
};
const menuText = (name) =>
  language === "en"
    ? menuEnglish[name.trim().toLocaleLowerCase("es")] || name
    : name;
function setLanguage(value) {
  language = value === "en" ? "en" : "es";
  document.documentElement.lang = language;
  document
    .querySelectorAll("[data-i18n]")
    .forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document
    .querySelectorAll("[data-language]")
    .forEach((el) =>
      el.setAttribute("aria-pressed", String(el.dataset.language === language)),
    );
  $("#name").placeholder = t("namePlaceholder");
  drawMenu();
  render();
}

const $ = (s) => document.querySelector(s);
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let menu = [],
  cart = [],
  key = null,
  timer;
const baseCategories = [
  "Tacos",
  "Tortas",
  "Burritos",
  "Fin de semana",
  "Quesadillas",
];
let selectedCategory = null,
  loading = false,
  loadError = false;
const normalize = (s) => s.trim().toLocaleLowerCase("es");
function categoryList() {
  const result = [...baseCategories];
  menu.forEach((p) => {
    if (!result.some((c) => normalize(c) === normalize(p.category)))
      result.push(p.category);
  });
  return result;
}
function drawMenu() {
  const categories = categoryList();
  $("#categories").innerHTML = categories
    .map(
      (c, n) =>
        `<button class="category-card" data-category="${n}"><span class="category-mark" aria-hidden="true">${String(n + 1).padStart(2, "0")}</span><strong>${esc(menuText(c))}</strong><span>${t("viewProducts")}</span></button>`,
    )
    .join("");
  $("#categories").classList.toggle("hidden", selectedCategory !== null);
  $("#menu").classList.toggle("hidden", selectedCategory === null);
  $("#screen-title").textContent = selectedCategory
    ? menuText(selectedCategory)
    : t("categories");
  $("#screen-description").textContent = selectedCategory
    ? t("chooseProducts")
    : t("chooseCategory");
  $("#back").textContent = selectedCategory
    ? t("backCategories")
    : t("backHome");
  $("#menu-status").textContent = loading
    ? t("loading")
    : loadError
      ? t("loadError")
      : "";
  $("#retry").classList.toggle("hidden", !loadError);
  if (selectedCategory === null) return;
  const items = menu.filter(
    (p) => normalize(p.category) === normalize(selectedCategory),
  );
  $("#menu").innerHTML =
    items
      .map(
        (p) =>
          `<article class="card" data-id="${p.id}"><span class="price">${money(p.price)}</span><h3>${esc(menuText(p.name))}</h3><p>${t("options")}</p>${p.options.map((o, i) => `<label><input type="checkbox" value="${i}">${esc(menuText(o.name))} <small>${o.price ? "+" + money(o.price) : t("free")}</small></label>`).join("")}<label>${t("quantity")} <input class="qty" type="number" min="1" max="50" value="1"></label><button class="add">${t("add")}</button></article>`,
      )
      .join("") ||
    (!loading && !loadError
      ? `<div class="card empty-category"><h3>${t("soon")}</h3><p>${t("emptyCategory")}</p></div>`
      : "");
}
async function load() {
  loading = true;
  loadError = false;
  drawMenu();
  try {
    const r = await fetch("/api/menu");
    if (!r.ok) throw Error("Menú no disponible");
    menu = await r.json();
  } catch {
    loadError = true;
    menu = [];
  } finally {
    loading = false;
    drawMenu();
  }
}
function showCategories() {
  selectedCategory = null;
  drawMenu();
  $("#screen-title").focus();
}
$("#start").onclick = () => {
  $("#welcome").classList.add("hidden");
  $("#ordering").classList.remove("hidden");
  showCategories();
  load();
};
$("#categories").onclick = (e) => {
  const button = e.target.closest("[data-category]");
  if (!button) return;
  selectedCategory = categoryList()[Number(button.dataset.category)];
  drawMenu();
  $("#screen-title").focus();
};
$("#back").onclick = () => {
  if (selectedCategory !== null) {
    showCategories();
    return;
  }
  if ((cart.length || $("#name").value.trim()) && !window.confirm(t("discard")))
    return;
  cart = [];
  key = null;
  $("#name").value = "";
  $("#message").textContent = "";
  render();
  showWelcome();
};
function showWelcome() {
  selectedCategory = null;
  setLanguage("es");
  $("#ordering").classList.add("hidden");
  $("#welcome").classList.remove("hidden");
  $("#start").focus();
  window.scrollTo(0, 0);
}
$("#retry").onclick = load;
$("#menu").onclick = (e) => {
  if (!e.target.matches(".add")) return;
  const card = e.target.closest(".card"),
    p = menu.find((p) => p.id === Number(card.dataset.id)),
    qty = Number(card.querySelector(".qty").value);
  if (!Number.isInteger(qty) || qty < 1 || qty > 50) return;
  cart.push({
    id: p.id,
    name: p.name,
    qty,
    options: [...card.querySelectorAll(":checked")].map(
      (i) => p.options[Number(i.value)],
    ),
    price: p.price,
  });
  key = null;
  render();
  card.querySelectorAll(":checked").forEach((i) => (i.checked = false));
  card.querySelector(".qty").value = 1;
};
function render() {
  $("#cart").innerHTML = cart.length
    ? cart
        .map(
          (i, n) =>
            `<div class="cartline"><strong>${i.qty} × ${esc(menuText(i.name))}</strong><small>${i.options.map((o) => esc(menuText(o.name))).join(" · ") || t("noOptions")}</small><span>${money(i.qty * (i.price + i.options.reduce((a, o) => a + o.price, 0)))}</span> <button data-remove="${n}">${t("remove")}</button></div>`,
        )
        .join("")
    : `<p>${t("emptyCart")}</p>`;
  $("#total").textContent = money(
    cart.reduce(
      (a, i) =>
        a + i.qty * (i.price + i.options.reduce((s, o) => s + o.price, 0)),
      0,
    ),
  );
  $("#order").disabled = !cart.length;
}
$("#cart").onclick = (e) => {
  if (e.target.dataset.remove !== undefined) {
    cart.splice(Number(e.target.dataset.remove), 1);
    key = null;
    render();
  }
};
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16),
  );
}
$("#order").onclick = async () => {
  if (!$("#name").value.trim()) {
    $("#message").textContent = t("needName");
    $("#name").focus();
    return;
  }
  $("#order").disabled = true;
  $("#message").textContent = t("saving");
  key ||= uuid();
  try {
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        name: $("#name").value,
        items: cart.map((i) => ({
          id: i.id,
          qty: i.qty,
          options: i.options.map((o) => o.name),
        })),
      }),
    });
    const o = await r.json();
    if (!r.ok) throw Error(o.error);
    $("#thanks").textContent = t("thanks").replace("{name}", o.name);
    $("#number").textContent = "#" + o.number;
    cart = [];
    key = null;
    $("#name").value = "";
    render();
    $("#message").textContent = "";
    $("#confirmation").showModal();
    timer = setTimeout(reset, 25000);
  } catch (e) {
    $("#message").textContent =
      (language === "es" ? e.message : null) || t("submitError");
    $("#order").disabled = false;
  }
};
function reset() {
  clearTimeout(timer);
  $("#confirmation").close();
  showWelcome();
  load();
}
$("#new").onclick = reset;
document
  .querySelectorAll("[data-language]")
  .forEach(
    (button) => (button.onclick = () => setLanguage(button.dataset.language)),
  );
setLanguage("es");
load();
render();
