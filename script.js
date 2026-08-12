/* =========================================================
   ORIGYN — STABLE MARKETPLACE + ORIGINAL STORY ANIMATIONS
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const $ = (s, root = document) => root.querySelector(s);
    const $$ = (s, root = document) => [...root.querySelectorAll(s)];

    const cartButton = $("#cart-button");
    const cartNav = $("#cart-nav");
    const closeCart = $("#close-cart");
    const cartDrawer = $("#cart-drawer");
    const cartItems = $("#cart-items");
    const cartTotal = $("#cart-total");
    const cartCount = $("#cart-count");
    const cartButtonCount = $("#cart-button-count");
    const checkoutBtn = $("#checkout-btn");
    const checkoutScreen = $("#checkout-screen");
    const backToCart = $("#back-to-cart");
    const checkoutItems = $("#checkout-items");
    const checkoutTotal = $("#checkout-total");
    const placeOrderBtn = $("#place-order-btn");
    const favoritesNav = $("#favorites-nav");
    const favoritesCount = $("#favorites-count");
    const productSearch = $("#product-search");
    const filterButtons = $$(".filter-btn");
    const productGrid = $(".product-grid");
    const productDetails = $("#product-details");
    const backToMarketplace = $("#back-to-marketplace");
    const getProductBtn = $("#get-product-btn");
    const techForm = $("#tech-form");
    const listingPreview = $("#listing-preview");
    const publishListingBtn = $("#publish-listing-btn");

    let cart = [];
    let favorites = [];
    let selectedProduct = null;
    let currentCategory = "all";

    const products = [
        {name:"NeuraVision AI",category:"ai",categoryName:"Artificial Intelligence",description:"An intelligent AI platform designed to automate everyday workflows.",price:2499,creator:"Origyn Labs",image:"AI"},
        {name:"RoboArm X1",category:"hardware",categoryName:"Hardware",description:"A modular robotic arm built for automation and experimentation.",price:18999,creator:"Origyn Labs",image:"HW"},
        {name:"DevFlow",category:"software",categoryName:"Software",description:"A developer productivity tool designed to simplify modern workflows.",price:999,creator:"Origyn Labs",image:"SW"},
        {name:"HomeSense",category:"iot",categoryName:"IoT",description:"Smart sensors that bring intelligent automation to your home.",price:3499,creator:"Origyn Labs",image:"IOT"},
        {name:"VisionCore",category:"ai",categoryName:"Machine Learning",description:"A computer vision toolkit for developers and researchers.",price:4999,creator:"Origyn Labs",image:"ML"},
        {name:"CloudForge",category:"iot",categoryName:"Web Technology",description:"Tools for building and deploying modern web applications faster.",price:1499,creator:"Origyn Labs",image:"WEB"}
    ];

    const categoryNames = {ai:"Artificial Intelligence",hardware:"Hardware",software:"Software",iot:"IoT / Web"};
    const imageLabels = {ai:"AI",hardware:"HW",software:"SW",iot:"IOT"};

    function money(value) { return `₹${Number(value || 0).toLocaleString("en-IN")}`; }

    function scrollToSection(id) {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({behavior:"smooth", block:"start"});
    }

    /* =====================================================
       NAVIGATION
    ===================================================== */
    $$(".nav-links a").forEach(link => {
        link.addEventListener("click", e => {
            const href = link.getAttribute("href");
            if (href && href.startsWith("#")) {
                e.preventDefault();
                scrollToSection(href.slice(1));
            }
        });
    });

    $("#explore-btn")?.addEventListener("click", () => scrollToSection("discover"));
    $("#sell-btn")?.addEventListener("click", () => scrollToSection("sell"));
    $("#start-selling-btn")?.addEventListener("click", () => scrollToSection("submit-tech"));

    /* =====================================================
       CART
    ===================================================== */
    function renderCheckout() {
        if (!checkoutItems || !checkoutTotal) return;
        checkoutItems.innerHTML = "";
        let total = 0;
        if (!cart.length) {
            checkoutItems.innerHTML = `<p class="empty-checkout">Your cart is empty.</p>`;
        } else {
            cart.forEach(item => {
                total += item.price * item.quantity;
                const row = document.createElement("div");
                row.className = "checkout-item";
                row.innerHTML = `<div><strong>${item.name}</strong><div class="checkout-item-quantity">× ${item.quantity}</div></div><strong class="checkout-item-price">${money(item.price * item.quantity)}</strong>`;
                checkoutItems.appendChild(row);
            });
        }
        checkoutTotal.textContent = money(total);
    }

    function renderCart() {
        if (!cartItems) return;
        cartItems.innerHTML = "";
        let total = 0, quantity = 0;
        if (!cart.length) {
            cartItems.innerHTML = `<div class="cart-empty"><p>Your cart is empty.</p><span>Discover some technology to get started.</span></div>`;
        } else {
            cart.forEach((item, index) => {
                total += item.price * item.quantity;
                quantity += item.quantity;
                const row = document.createElement("div");
                row.className = "cart-item";
                row.innerHTML = `<div class="cart-item-info"><h3>${item.name}</h3><p>${money(item.price)}</p><div class="cart-item-controls"><button type="button" data-cart-action="dec" data-index="${index}">−</button><span>${item.quantity}</span><button type="button" data-cart-action="inc" data-index="${index}">+</button></div></div><strong class="cart-item-price">${money(item.price * item.quantity)}</strong><button type="button" data-cart-action="remove" data-index="${index}">×</button>`;
                cartItems.appendChild(row);
            });
        }
        if (cartTotal) cartTotal.textContent = money(total);
        if (cartCount) cartCount.textContent = quantity;
        if (cartButtonCount) cartButtonCount.textContent = quantity;
        renderCheckout();
    }

    function openCart() { cartDrawer?.classList.add("active"); }
    function closeCartPanel() { cartDrawer?.classList.remove("active"); }

    function addToCart(product) {
        if (!product) return;
        const item = cart.find(x => x.name === product.name);
        if (item) item.quantity++;
        else cart.push({...product, quantity:1});
        renderCart();
        openCart();
    }

    cartButton?.addEventListener("click", e => {e.preventDefault(); openCart();});
    cartNav?.addEventListener("click", e => {e.preventDefault(); openCart();});
    closeCart?.addEventListener("click", closeCartPanel);
    cartItems?.addEventListener("click", e => {
        const btn = e.target.closest("[data-cart-action]");
        if (!btn) return;
        const index = Number(btn.dataset.index);
        const action = btn.dataset.cartAction;
        if (action === "inc") cart[index].quantity++;
        if (action === "dec") cart[index].quantity--;
        if (action === "remove" || cart[index]?.quantity <= 0) cart.splice(index,1);
        renderCart();
    });

    checkoutBtn?.addEventListener("click", () => {
        if (!cart.length) return alert("Your cart is empty.");
        closeCartPanel();
        checkoutScreen?.classList.add("active");
        renderCheckout();
    });

    backToCart?.addEventListener("click", () => {
        checkoutScreen?.classList.remove("active");
        openCart();
    });

    placeOrderBtn?.addEventListener("click", () => {
        const name = $("#checkout-name")?.value.trim();
        const email = $("#checkout-email")?.value.trim();
        const address = $("#checkout-address")?.value.trim();
        const city = $("#checkout-city")?.value.trim();
        const pin = $("#checkout-pincode")?.value.trim();
        if (!name || !email || !address || !city || !/^\d{6}$/.test(pin || "")) return alert("Please complete all delivery details and enter a valid 6-digit PIN code.");
        alert(`Order placed successfully!\n\nThank you, ${name}!`);
        cart = [];
        renderCart();
        checkoutScreen?.classList.remove("active");
        ["#checkout-name","#checkout-email","#checkout-address","#checkout-city","#checkout-pincode"].forEach(id => {const el=$(id); if(el) el.value="";});
        scrollToSection("home");
    });

    /* =====================================================
       FAVORITES
    ===================================================== */
    function renderFavoriteCount() { if (favoritesCount) favoritesCount.textContent = favorites.length; }
    function toggleFavorite(product) {
        const i = favorites.findIndex(x => x.name === product.name);
        if (i >= 0) favorites.splice(i,1); else favorites.push(product);
        renderFavoriteCount();
        $$(".favorite-product-btn").forEach(btn => {
            btn.classList.toggle("active", favorites.some(x => x.name === btn.dataset.product));
            btn.textContent = btn.classList.contains("active") ? "♥" : "♡";
        });
    }
    favoritesNav?.addEventListener("click", () => {
        alert(favorites.length ? `You have ${favorites.length} favorite technology item(s).` : "You haven't added any favorites yet.");
    });

    /* =====================================================
       PRODUCT CARDS / MARKETPLACE
    ===================================================== */
    function cardHTML(product, index) {
        return `<button type="button" class="favorite-product-btn" data-product="${product.name}" aria-label="Favorite">♡</button><div class="product-image">${product.image}</div><div class="product-content"><p class="product-category">${product.categoryName}</p><h3>${product.name}</h3><p>${product.description}</p><div class="product-bottom"><strong>${money(product.price)}</strong><div class="product-actions"><a href="#" data-view-product="${index}">View Product →</a><button type="button" class="add-to-cart-btn" data-add-product="${index}">Add to Cart</button></div></div></div>`;
    }

    function decorateExistingCards() {
        $$(".product-card").forEach((card, index) => {
            if (!products[index]) return;
            card.dataset.productIndex = index;
            if (!card.querySelector(".favorite-product-btn")) {
                const image = $(".product-image", card);
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "favorite-product-btn";
                btn.dataset.product = products[index].name;
                btn.textContent = "♡";
                card.insertBefore(btn, image || card.firstChild);
            }
            const actions = $(".product-actions", card);
            const view = $(".product-bottom a", card);
            if (!actions && view) {
                const wrapper = document.createElement("div");
                wrapper.className = "product-actions";
                view.parentNode.insertBefore(wrapper, view);
                wrapper.appendChild(view);
                const add = document.createElement("button");
                add.type = "button";
                add.className = "add-to-cart-btn";
                add.dataset.addProduct = index;
                add.textContent = "Add to Cart";
                wrapper.appendChild(add);
            }
        });
    }

    function renderDynamicProduct(product, index) {
        if (!productGrid) return;
        const article = document.createElement("article");
        article.className = "product-card";
        article.dataset.category = product.category;
        article.dataset.productIndex = index;
        article.innerHTML = cardHTML(product,index);
        productGrid.appendChild(article);
    }

    function openProduct(product) {
        selectedProduct = product;
        $("#detail-image") && ($("#detail-image").textContent = product.image);
        $("#detail-category") && ($("#detail-category").textContent = product.categoryName.toUpperCase());
        $("#detail-name") && ($("#detail-name").textContent = product.name);
        $("#detail-description") && ($("#detail-description").textContent = product.description);
        $("#detail-creator") && ($("#detail-creator").textContent = product.creator);
        $("#detail-price") && ($("#detail-price").textContent = money(product.price));
        if (productDetails) {
            productDetails.style.display = "flex";
            productDetails.classList.add("active");
            productDetails.scrollIntoView({behavior:"smooth",block:"start"});
        }
    }

    productGrid?.addEventListener("click", e => {
        const fav = e.target.closest(".favorite-product-btn");
        const add = e.target.closest("[data-add-product]");
        const view = e.target.closest("[data-view-product]");
        if (fav) { e.preventDefault(); const p=products.find(x=>x.name===fav.dataset.product); if(p) toggleFavorite(p); return; }
        if (add) { e.preventDefault(); const p=products[Number(add.dataset.addProduct)]; if(p) addToCart(p); return; }
        if (view) { e.preventDefault(); const p=products[Number(view.dataset.viewProduct)]; if(p) openProduct(p); }
    });

    backToMarketplace?.addEventListener("click", () => {
        if (productDetails) { productDetails.classList.remove("active"); productDetails.style.display="none"; }
        scrollToSection("discover");
    });
    getProductBtn?.addEventListener("click", () => addToCart(selectedProduct));

    function filterProducts() {
        const q = (productSearch?.value || "").trim().toLowerCase();
        $$(".product-card").forEach(card => {
            const p = products[Number(card.dataset.productIndex)];
            if (!p) return;
            const matchCategory = currentCategory === "all" || p.category === currentCategory;
            const matchSearch = !q || `${p.name} ${p.categoryName} ${p.description}`.toLowerCase().includes(q);
            card.style.display = matchCategory && matchSearch ? "" : "none";
        });
    }
    productSearch?.addEventListener("input", filterProducts);
    filterButtons.forEach(btn => btn.addEventListener("click", () => {
        filterButtons.forEach(x=>x.classList.remove("active"));
        btn.classList.add("active");
        currentCategory = btn.dataset.category || "all";
        filterProducts();
    }));

    /* =====================================================
       LISTING / LIVE PREVIEW / PUBLISH
    ===================================================== */
    function formMessage(text) { const el=$("#form-message"); if(el) el.textContent=text; }
    techForm?.addEventListener("submit", e => {
        e.preventDefault();
        const name=$("#tech-name")?.value.trim();
        const category=$("#tech-category")?.value;
        const description=$("#tech-description")?.value.trim();
        const price=Number($("#tech-price")?.value);
        const creator=$("#tech-creator")?.value.trim();
        if(!name || !category || !description || !price || !creator) return formMessage("Please complete all fields.");
        $("#preview-image").textContent=imageLabels[category]||"TECH";
        $("#preview-category").textContent=categoryNames[category]||"TECHNOLOGY";
        $("#preview-name").textContent=name;
        $("#preview-description").textContent=description;
        $("#preview-price").textContent=money(price);
        $("#preview-creator").textContent=creator;
        if(listingPreview) listingPreview.style.display="block";
        formMessage("Preview updated successfully.");
        listingPreview?.scrollIntoView({behavior:"smooth",block:"center"});
    });

    publishListingBtn?.addEventListener("click", () => {
        const name=$("#tech-name")?.value.trim();
        const category=$("#tech-category")?.value;
        const description=$("#tech-description")?.value.trim();
        const price=Number($("#tech-price")?.value);
        const creator=$("#tech-creator")?.value.trim();
        if(!name || !category || !description || !price || !creator) return alert("Please create a listing first.");
        const product={name,category,categoryName:categoryNames[category],description,price,creator,image:imageLabels[category]};
        products.push(product);
        renderDynamicProduct(product,products.length-1);
        formMessage("Listing published successfully.");
        alert(`${name} has been published to the marketplace!`);
        techForm?.reset();
        filterProducts();
        scrollToSection("discover");
    });

    /* =====================================================
       FIX VISIBILITY FOR DYNAMIC PANELS
    ===================================================== */
    const fixStyle = document.createElement("style");
    fixStyle.textContent = `#product-details.active{display:flex!important}.favorite-product-btn{font-family:inherit}.product-card{position:relative}.listing-preview-panel{display:block}`;
    document.head.appendChild(fixStyle);

    decorateExistingCards();
    renderCart();
    renderFavoriteCount();
    filterProducts();

    /* =====================================================
       RESTORED ORIGINAL GSAP ANIMATION SYSTEM
    ===================================================== */
    if (typeof gsap === "undefined") {
        console.warn("Origyn: GSAP did not load; interactions still work.");
        return;
    }
    if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

    const intro = gsap.timeline();
    intro.from(".logo", {y:-30,opacity:0,duration:1,ease:"power3.out"})
         .from(".nav-links a", {y:-20,opacity:0,duration:.6,stagger:.1,ease:"power3.out"},"-=.5")
         .from("#home h1", {y:80,opacity:0,duration:1,ease:"power3.out"})
         .from("#home p", {y:40,opacity:0,duration:.8,ease:"power3.out"});

    gsap.fromTo("#explore-btn",{y:30,opacity:0},{y:0,opacity:1,duration:.8,delay:1.8,ease:"power3.out"});
    gsap.fromTo("#sell-btn",{y:30,opacity:0},{y:0,opacity:1,duration:.8,delay:2,ease:"power3.out"});

    if (typeof ScrollTrigger !== "undefined") {
        gsap.from("#discover .section-heading",{y:100,opacity:0,duration:1,scrollTrigger:{trigger:"#discover",start:"top 80%",toggleActions:"play none none reverse"}});
        gsap.from(".product-card",{y:100,opacity:0,duration:.8,stagger:.5,ease:"power3.out",scrollTrigger:{trigger:".product-grid",start:"top 80%",toggleActions:"play none none reverse"}});
        gsap.from(".discover-card",{opacity:0,duration:.7,stagger:.2,ease:"power3.out",scrollTrigger:{trigger:"#discover",start:"top 70%",toggleActions:"play none none reverse"}});

        /* ORIGINAL PINNED DELIVERY STORY */
        ScrollTrigger.create({trigger:"#story",start:"top top",end:"+=2000",pin:true,anticipatePin:1});

        gsap.to(".delivery-man",{x:500,scrollTrigger:{trigger:"#story",start:"top top",end:"+=2000",scrub:1}});
        gsap.to(".delivery-box",{x:500,scrollTrigger:{trigger:"#story",start:"top top",end:"+=2000",scrub:1}});

        const walking=gsap.timeline({repeat:-1,paused:true,yoyo:false});
        walking.to(".delivery-man",{y:-8,rotation:3,duration:.25,ease:"power1.inOut"})
               .to(".delivery-man",{y:0,rotation:-3,duration:.25,ease:"power1.inOut"});

        const collision=gsap.timeline({paused:true});
        collision.to(".delivery-man",{rotation:-8,x:"+=20",duration:.2})
                 .to(".delivery-man",{rotation:8,x:"-=10",duration:.2})
                 .to(".delivery-man",{rotation:-15,y:25,duration:.25});

        const boxOpen=gsap.timeline({paused:true});
        boxOpen.to(".delivery-box",{rotation:-15,scale:1.15,duration:.25,ease:"power2.out"})
               .to(".delivery-box",{rotation:15,scale:1,duration:.25,ease:"power2.inOut"});

        const techReveal=gsap.timeline({paused:true});
        techReveal.fromTo(".tech-item",{y:40,opacity:0,scale:.8},{y:0,opacity:1,scale:1,duration:.6,stagger:.2,ease:"back.out(1.7)"});

        let collided=false, opened=false, revealed=false;
        ScrollTrigger.create({
            trigger:"#story",start:"top top",end:"+=2000",
            onEnter:()=>walking.play(),
            onEnterBack:()=>{walking.play();collided=false;opened=false;revealed=false;collision.reverse();boxOpen.reverse();techReveal.reverse();},
            onLeave:()=>walking.pause(),onLeaveBack:()=>walking.pause(),
            onUpdate:self=>{
                if(self.progress>.45 && !collided){collided=true;walking.pause();collision.play();}
                if(self.progress>.70 && !opened){opened=true;boxOpen.play();}
                if(self.progress>.82 && !revealed){revealed=true;techReveal.play();}
            }
        });

        gsap.from(".sell-content",{x:-50,opacity:0,duration:.8,ease:"power3.out",scrollTrigger:{trigger:"#sell",start:"top 70%",toggleActions:"play none none reverse"}});
        gsap.from(".sell-step",{opacity:0,duration:.7,stagger:.2,ease:"power3.out",scrollTrigger:{trigger:".sell-steps",start:"top 75%",toggleActions:"play none none reverse"}});
        gsap.from(".contact-content",{y:80,opacity:0,duration:1,ease:"power3.out",scrollTrigger:{trigger:"#contact",start:"top 75%",toggleActions:"play none none reverse"}});

        const aboutTimeline=gsap.timeline({scrollTrigger:{trigger:"#about",start:"top 70%",toggleActions:"play none none reverse"}});
        aboutTimeline.from(".about-heading",{x:-70,opacity:0,duration:.8,ease:"power3.out"})
                     .from(".about-text",{y:50,opacity:0,duration:.7,ease:"power3.out"},"-=.4")
                     .from(".about-stat",{y:50,opacity:0,duration:.6,stagger:.2,ease:"power3.out"},"-=.3");

        ScrollTrigger.refresh();
    } else {
        gsap.from("#home h1",{opacity:0,y:40,duration:1});
    }

    document.addEventListener("keydown", e => {
        if(e.key === "Escape") {
            closeCartPanel();
            checkoutScreen?.classList.remove("active");
            if(productDetails){productDetails.classList.remove("active");productDetails.style.display="none";}
        }
    });

    console.log("Origyn restored: marketplace + cart + original Story animations loaded.");
});
