/* =========================================================
   ORIGYN — MARKETPLACE + CART + ORIGINAL STORY ANIMATIONS
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

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
    const productGrid = $(".product-grid");
    const productSearch = $("#product-search");
    const filterButtons = $$(".filter-btn");
    const productDetails = $("#product-details");
    const discoverSection = $("#discover");
    const marketplaceControls = $(".marketplace-controls");
    const storySection = $("#story");

    /* Repair the old marketplace markup at runtime. */
    if (discoverSection) {
        if (marketplaceControls && marketplaceControls.parentElement !== discoverSection) {
            discoverSection.appendChild(marketplaceControls);
        }
        if (productGrid && productGrid.parentElement !== discoverSection) {
            discoverSection.appendChild(productGrid);
        }
    }
    if (productDetails && storySection && productDetails.parentElement !== document.querySelector("main")) {
        storySection.parentElement.insertBefore(productDetails, storySection);
    }

    const backToMarketplace = $("#back-to-marketplace");
    const getProductBtn = $("#get-product-btn");
    const techForm = $("#tech-form");
    const listingPreview = $("#listing-preview");
    const publishListingBtn = $("#publish-listing-btn");

    let products = [
        {name:"NeuraVision AI",category:"ai",categoryName:"Artificial Intelligence",description:"An intelligent AI platform designed to automate everyday workflows.",price:2499,creator:"Origyn Labs",image:"AI"},
        {name:"RoboArm X1",category:"hardware",categoryName:"Hardware",description:"A modular robotic arm built for automation and experimentation.",price:18999,creator:"Origyn Labs",image:"HW"},
        {name:"DevFlow",category:"software",categoryName:"Software",description:"A developer productivity tool designed to simplify modern workflows.",price:999,creator:"Origyn Labs",image:"SW"},
        {name:"HomeSense",category:"iot",categoryName:"IoT",description:"Smart sensors that bring intelligent automation to your home.",price:3499,creator:"Origyn Labs",image:"IOT"},
        {name:"VisionCore",category:"ai",categoryName:"Machine Learning",description:"A computer vision toolkit for developers and researchers.",price:4999,creator:"Origyn Labs",image:"ML"},
        {name:"CloudForge",category:"iot",categoryName:"Web Technology",description:"Tools for building and deploying modern web applications faster.",price:1499,creator:"Origyn Labs",image:"WEB"}
    ];

    const categoryNames = {ai:"Artificial Intelligence",hardware:"Hardware",software:"Software",iot:"IoT / Web"};
    const imageLabels = {ai:"AI",hardware:"HW",software:"SW",iot:"IOT"};
    let cart = [];
    let favorites = [];
    let selectedProduct = null;
    let currentCategory = "all";
    const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;

    function scrollToSection(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const header = $("header");
        const offset = header ? header.offsetHeight + 12 : 90;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({top, behavior:"smooth"});
    }

    $$(".nav-links a").forEach(link => link.addEventListener("click", event => {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        event.preventDefault();
        scrollToSection(href.slice(1));
    }));
    $("#explore-btn")?.addEventListener("click", () => scrollToSection("discover"));
    $("#sell-btn")?.addEventListener("click", () => scrollToSection("sell"));
    $("#start-selling-btn")?.addEventListener("click", () => scrollToSection("submit-tech"));

    function moveCheckoutToBody() {
        if (checkoutScreen && checkoutScreen.parentElement !== document.body) document.body.appendChild(checkoutScreen);
    }

    function renderCheckout() {
        if (!checkoutItems || !checkoutTotal) return;
        checkoutItems.innerHTML = "";
        let total = 0;
        if (!cart.length) {
            checkoutItems.innerHTML = `<p class="empty-checkout">Your cart is empty.</p>`;
        } else {
            cart.forEach(item => {
                const lineTotal = Number(item.price) * Number(item.quantity);
                total += lineTotal;
                const row = document.createElement("div");
                row.className = "checkout-item";
                row.innerHTML = `<div><div class="checkout-item-name">${item.name}</div><div class="checkout-item-quantity">Quantity: ${item.quantity}</div></div><div class="checkout-item-price">${money(lineTotal)}</div>`;
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
                total += Number(item.price) * Number(item.quantity);
                quantity += Number(item.quantity);
                const row = document.createElement("div");
                row.className = "cart-item";
                row.innerHTML = `<div class="cart-item-info"><h3>${item.name}</h3><p>${money(item.price)}</p><div class="cart-item-controls"><button type="button" data-cart-action="dec" data-index="${index}">−</button><span>${item.quantity}</span><button type="button" data-cart-action="inc" data-index="${index}">+</button></div></div><strong class="cart-item-price">${money(item.price * item.quantity)}</strong><button type="button" data-cart-action="remove" data-index="${index}" aria-label="Remove item">×</button>`;
                cartItems.appendChild(row);
            });
        }
        if (cartTotal) cartTotal.textContent = money(total);
        if (cartCount) cartCount.textContent = quantity;
        if (cartButtonCount) cartButtonCount.textContent = quantity;
        renderCheckout();
    }

    function openCart() {
        moveCheckoutToBody();
        checkoutScreen?.classList.remove("active");
        cartDrawer?.classList.add("active");
    }
    function closeCartPanel() { cartDrawer?.classList.remove("active"); }

    function addToCart(product) {
        if (!product) return;
        const existing = cart.find(item => item.name === product.name);
        if (existing) existing.quantity += 1;
        else cart.push({...product, quantity:1});
        renderCart();
        openCart();
    }

    cartButton?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); openCart(); });
    cartNav?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); openCart(); });
    closeCart?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); closeCartPanel(); });

    cartItems?.addEventListener("click", event => {
        const button = event.target.closest("[data-cart-action]");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        const index = Number(button.dataset.index);
        const action = button.dataset.cartAction;
        const item = cart[index];
        if (!item) return;
        if (action === "inc") item.quantity += 1;
        if (action === "dec") item.quantity -= 1;
        if (action === "remove" || item.quantity <= 0) cart.splice(index, 1);
        renderCart();
    });

    checkoutBtn?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        if (!cart.length) return alert("Your cart is empty.");
        moveCheckoutToBody();
        renderCheckout();
        closeCartPanel();
        checkoutScreen?.classList.add("active");
        checkoutScreen?.scrollTo({top:0, behavior:"instant"});
        window.scrollTo({top:0, behavior:"instant"});
    });

    backToCart?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        checkoutScreen?.classList.remove("active");
        openCart();
    });

    placeOrderBtn?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
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
        ["#checkout-name","#checkout-email","#checkout-address","#checkout-city","#checkout-pincode"].forEach(id => { const field=$(id); if(field) field.value=""; });
        scrollToSection("home");
    });

    function renderFavoriteCount() { if (favoritesCount) favoritesCount.textContent = favorites.length; }
    function refreshFavoriteButtons() {
        $$(".favorite-product-btn").forEach(button => {
            const active = favorites.some(product => product.name === button.dataset.product);
            button.classList.toggle("active", active);
            button.textContent = active ? "♥" : "♡";
        });
    }
    function toggleFavorite(product) {
        if (!product) return;
        const index = favorites.findIndex(item => item.name === product.name);
        if (index >= 0) favorites.splice(index, 1); else favorites.push(product);
        renderFavoriteCount();
        refreshFavoriteButtons();
    }
    favoritesNav?.addEventListener("click", event => {
        event.preventDefault(); event.stopPropagation();
        alert(favorites.length ? `You have ${favorites.length} favorite technology item(s).` : "You haven't added any favorites yet.");
    });

    function productForCard(card) {
        const index = Number(card?.dataset.productIndex);
        return Number.isInteger(index) ? products[index] : null;
    }

    function enhanceProductCards() {
        $$(".product-card").forEach((card, index) => {
            if (!products[index]) return;
            card.dataset.productIndex = index;
            card.dataset.category = products[index].category;
            const image = $(".product-image", card);
            if (!card.querySelector(".favorite-product-btn")) {
                const favorite = document.createElement("button");
                favorite.type = "button";
                favorite.className = "favorite-product-btn";
                favorite.dataset.product = products[index].name;
                favorite.setAttribute("aria-label", "Favorite product");
                favorite.textContent = "♡";
                card.insertBefore(favorite, image || card.firstChild);
            }
            const bottom = $(".product-bottom", card);
            if (!bottom) return;
            let view = $("[data-view-product]", bottom);
            if (!view) {
                view = $("a", bottom) || document.createElement("a");
                if (!view.parentElement) { view.href="#"; view.textContent="View Product →"; bottom.appendChild(view); }
                view.dataset.viewProduct = index;
            }
            if (!bottom.querySelector(".product-actions")) {
                const actions = document.createElement("div");
                actions.className = "product-actions";
                view.parentNode.insertBefore(actions, view);
                actions.appendChild(view);
                const add = document.createElement("button");
                add.type = "button";
                add.className = "add-to-cart-btn";
                add.dataset.addProduct = index;
                add.textContent = "Add to Cart";
                actions.appendChild(add);
            }
        });
        refreshFavoriteButtons();
    }

    function openProduct(product) {
        if (!product || !productDetails) return;
        selectedProduct = product;
        $("#detail-image") && ($("#detail-image").textContent = product.image);
        $("#detail-category") && ($("#detail-category").textContent = product.categoryName.toUpperCase());
        $("#detail-name") && ($("#detail-name").textContent = product.name);
        $("#detail-description") && ($("#detail-description").textContent = product.description);
        $("#detail-creator") && ($("#detail-creator").textContent = product.creator);
        $("#detail-price") && ($("#detail-price").textContent = money(product.price));
        productDetails.style.display = "flex";
        productDetails.classList.add("active");
        requestAnimationFrame(() => {
            const header = $("header");
            const offset = header ? header.offsetHeight + 15 : 95;
            const top = productDetails.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({top, behavior:"smooth"});
        });
    }

    productGrid?.addEventListener("click", event => {
        const favorite = event.target.closest(".favorite-product-btn");
        const add = event.target.closest("[data-add-product]");
        const view = event.target.closest("[data-view-product]");
        if (!favorite && !add && !view) return;
        event.preventDefault();
        event.stopPropagation();
        if (favorite) {
            toggleFavorite(products.find(item => item.name === favorite.dataset.product));
            return;
        }
        if (add) {
            addToCart(products[Number(add.dataset.addProduct)]);
            return;
        }
        openProduct(products[Number(view.dataset.viewProduct)]);
    });

    backToMarketplace?.addEventListener("click", event => {
        event.preventDefault(); event.stopPropagation();
        if (productDetails) { productDetails.classList.remove("active"); productDetails.style.display="none"; }
        scrollToSection("discover");
    });
    getProductBtn?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); addToCart(selectedProduct); });

    function filterProducts() {
        const query = (productSearch?.value || "").trim().toLowerCase();
        $$(".product-card").forEach(card => {
            const product = productForCard(card);
            if (!product) return;
            const categoryMatch = currentCategory === "all" || product.category === currentCategory;
            const searchMatch = !query || `${product.name} ${product.categoryName} ${product.description}`.toLowerCase().includes(query);
            card.style.display = categoryMatch && searchMatch ? "" : "none";
        });
    }
    productSearch?.addEventListener("input", filterProducts);
    filterButtons.forEach(button => button.addEventListener("click", event => {
        event.preventDefault(); event.stopPropagation();
        filterButtons.forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        currentCategory = button.dataset.category || "all";
        filterProducts();
    }));

    function formMessage(text) { const element=$("#form-message"); if(element) element.textContent=text; }
    function updatePreview() {
        const name=$("#tech-name")?.value.trim();
        const category=$("#tech-category")?.value;
        const description=$("#tech-description")?.value.trim();
        const price=Number($("#tech-price")?.value);
        const creator=$("#tech-creator")?.value.trim();
        if(!name || !category || !description || !price || !creator) { formMessage("Please complete all fields."); return false; }
        $("#preview-image") && ($("#preview-image").textContent=imageLabels[category]||"TECH");
        $("#preview-category") && ($("#preview-category").textContent=categoryNames[category]||"TECHNOLOGY");
        $("#preview-name") && ($("#preview-name").textContent=name);
        $("#preview-description") && ($("#preview-description").textContent=description);
        $("#preview-price") && ($("#preview-price").textContent=money(price));
        $("#preview-creator") && ($("#preview-creator").textContent=creator);
        if(listingPreview) listingPreview.style.display="block";
        formMessage("Preview updated successfully.");
        return {name,category,description,price,creator};
    }
    techForm?.addEventListener("submit", event => {
        event.preventDefault(); event.stopPropagation();
        const data=updatePreview(); if(!data) return;
        requestAnimationFrame(()=>listingPreview?.scrollIntoView({behavior:"smooth",block:"center"}));
    });
    publishListingBtn?.addEventListener("click", event => {
        event.preventDefault(); event.stopPropagation();
        const data=updatePreview(); if(!data) return;
        const newProduct={...data,categoryName:categoryNames[data.category]||"Technology",image:imageLabels[data.category]||"TECH"};
        products.push(newProduct);
        renderDynamicProduct(newProduct, products.length-1);
        enhanceProductCards();
        filterProducts();
        formMessage("Published to the marketplace successfully.");
        $("#tech-form")?.reset();
        if(listingPreview) listingPreview.style.display="none";
        scrollToSection("discover");
    });

    function renderDynamicProduct(product,index) {
        if(!productGrid) return;
        const article=document.createElement("article");
        article.className="product-card";
        article.dataset.category=product.category;
        article.dataset.productIndex=index;
        article.innerHTML=`<div class="product-image">${product.image}</div><div class="product-content"><p class="product-category">${product.categoryName}</p><h3>${product.name}</h3><p>${product.description}</p><div class="product-bottom"><strong>${money(product.price)}</strong><a href="#" data-view-product="${index}">View Product →</a></div></div>`;
        productGrid.appendChild(article);
    }

    document.addEventListener("keydown", event => {
        if(event.key!=="Escape") return;
        closeCartPanel();
        checkoutScreen?.classList.remove("active");
        if(productDetails) { productDetails.classList.remove("active"); productDetails.style.display="none"; }
    });

    moveCheckoutToBody();
    enhanceProductCards();
    renderCart();
    renderFavoriteCount();
    filterProducts();

    const header=$("header");
    if(header) {
        const updateHeader=()=>header.classList.toggle("scrolled",window.scrollY>40);
        window.addEventListener("scroll",updateHeader,{passive:true});
        updateHeader();
    }

    /* =========================================================
       ORIGINAL GSAP STORY / PAGE ANIMATIONS
    ========================================================= */
    if(typeof gsap!=="undefined") {
        if(typeof ScrollTrigger!=="undefined") gsap.registerPlugin(ScrollTrigger);
        const intro=gsap.timeline();
        intro.from(".logo",{y:-30,opacity:0,duration:0.8,ease:"power3.out"})
            .from(".nav-links a",{y:-20,opacity:0,duration:0.45,stagger:0.07,ease:"power3.out"},"-=0.45")
            .from("#home h1",{y:80,opacity:0,duration:0.9,ease:"power3.out"},"-=0.2")
            .from("#home p",{y:40,opacity:0,duration:0.7,ease:"power3.out"},"-=0.5")
            .from(".hero-buttons button",{y:25,opacity:0,duration:0.55,stagger:0.1,ease:"power3.out"},"-=0.3");

        if(typeof ScrollTrigger!=="undefined") {
            gsap.from(".product-card",{y:100,opacity:0,duration:0.8,stagger:0.15,ease:"power3.out",scrollTrigger:{trigger:".product-grid",start:"top 82%",toggleActions:"play none none reverse"}});
            gsap.from(".delivery-man",{x:-150,opacity:0,duration:1,scrollTrigger:{trigger:"#story",start:"top 75%",toggleActions:"play none none reverse"}});
            gsap.from(".rock",{x:80,opacity:0,duration:0.8,delay:0.2,scrollTrigger:{trigger:"#story",start:"top 75%",toggleActions:"play none none reverse"}});
            gsap.from(".sell-content",{x:-50,opacity:0,duration:0.8,ease:"power3.out",scrollTrigger:{trigger:"#sell",start:"top 70%",toggleActions:"play none none reverse"}});
            gsap.from(".sell-step",{opacity:0,y:30,duration:0.6,stagger:0.15,scrollTrigger:{trigger:".sell-steps",start:"top 80%",toggleActions:"play none none reverse"}});
            gsap.from(".contact-content",{y:80,opacity:0,duration:1,ease:"power3.out",scrollTrigger:{trigger:"#contact",start:"top 75%",toggleActions:"play none none reverse"}});
            const aboutTimeline=gsap.timeline({scrollTrigger:{trigger:"#about",start:"top 70%",toggleActions:"play none none reverse"}});
            aboutTimeline.from(".about-heading",{x:-70,opacity:0,duration:0.8,ease:"power3.out"})
                .from(".about-text",{y:50,opacity:0,duration:0.7,ease:"power3.out"},"-=0.4")
                .from(".about-stat",{y:50,opacity:0,duration:0.6,stagger:0.2,ease:"power3.out"},"-=0.3");

            gsap.to(".delivery-box",{x:500,scrollTrigger:{trigger:"#story",start:"top top",end:"+=2000",scrub:1}});
            const walking=gsap.timeline({repeat:-1,paused:true});
            walking.to(".delivery-man",{y:-8,rotation:3,duration:0.25,ease:"power1.inOut"}).to(".delivery-man",{y:0,rotation:-3,duration:0.25,ease:"power1.inOut"});
            ScrollTrigger.create({trigger:"#story",start:"top top",end:"+=2000",onEnter:()=>walking.play(),onLeave:()=>walking.pause(),onEnterBack:()=>walking.play(),onLeaveBack:()=>walking.pause()});

            const collision=gsap.timeline({paused:true});
            collision.to(".delivery-man",{rotation:-8,x:"+=20",duration:0.2}).to(".delivery-man",{rotation:8,x:"-=10",duration:0.2}).to(".delivery-man",{rotation:-15,y:25,duration:0.25});
            let collisionTriggered=false;
            ScrollTrigger.create({trigger:"#story",start:"top top",end:"+=2000",onUpdate:self=>{if(self.progress>0.45&&!collisionTriggered){collisionTriggered=true;walking.pause();collision.play();}}});

            const boxOpen=gsap.timeline({paused:true});
            boxOpen.to(".delivery-box",{rotation:-15,scale:1.15,duration:0.25,ease:"power2.out"}).to(".delivery-box",{rotation:15,scale:1,duration:0.25,ease:"power2.inOut"});
            let boxTriggered=false;
            ScrollTrigger.create({trigger:"#story",start:"top top",end:"+=2000",onUpdate:self=>{if(self.progress>0.70&&!boxTriggered){boxTriggered=true;boxOpen.play();}}});

            const techReveal=gsap.timeline({paused:true});
            techReveal.fromTo(".tech-item",{y:40,opacity:0,scale:0.8},{y:0,opacity:1,scale:1,duration:0.6,stagger:0.2,ease:"back.out(1.7)"});
            let revealTriggered=false;
            ScrollTrigger.create({trigger:"#story",start:"top top",end:"+=2000",onUpdate:self=>{if(self.progress>0.82&&!revealTriggered){revealTriggered=true;techReveal.play();}}});
        }
    } else {
        console.warn("GSAP was not loaded.");
    }

    console.log("Origyn initialized — marketplace, cart and story animations ready.");
});
