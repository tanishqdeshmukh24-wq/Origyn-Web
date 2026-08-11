// ============================================================
// ORIGYN — COMPLETE SCRIPT
// Persistent Marketplace Edition
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // ========================================================
    // GSAP SETUP
    // ========================================================

    if (typeof gsap === "undefined") {
        console.error("GSAP is not loaded.");
        return;
    }

    if (typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);
    }


    // ========================================================
    // HELPERS
    // ========================================================

    const qs = (selector) => document.querySelector(selector);
    const qsa = (selector) => document.querySelectorAll(selector);


    // ========================================================
    // STORAGE
    // ========================================================

    const STORAGE_KEY = "origyn_marketplace_products";


    function getSavedProducts() {

        try {

            const saved =
                localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return [];
            }

            const parsed = JSON.parse(saved);

            return Array.isArray(parsed)
                ? parsed
                : [];

        }

        catch (error) {

            console.error(
                "Could not load saved products:",
                error
            );

            return [];

        }

    }


    function saveProducts(products) {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(products)
            );

        }

        catch (error) {

            console.error(
                "Could not save products:",
                error
            );

        }

    }


    // ========================================================
    // PRODUCT DATA
    // ========================================================

    const productData = {

        "NeuraVision AI": {

            category: "ARTIFICIAL INTELLIGENCE",

            description:
                "An intelligent AI platform designed to automate everyday workflows.",

            creator: "Origyn Labs",

            price: "₹2,499",

            image: "AI"

        },


        "RoboArm X1": {

            category: "HARDWARE",

            description:
                "A modular robotic arm built for automation and experimentation.",

            creator: "Origyn Robotics",

            price: "₹18,999",

            image: "HW"

        },


        "DevFlow": {

            category: "SOFTWARE",

            description:
                "A developer productivity tool designed to simplify modern workflows.",

            creator: "Origyn Software",

            price: "₹999",

            image: "SW"

        },


        "HomeSense": {

            category: "IOT",

            description:
                "Smart sensors that bring intelligent automation to your home.",

            creator: "Origyn Labs",

            price: "₹3,499",

            image: "IOT"

        },


        "VisionCore": {

            category: "MACHINE LEARNING",

            description:
                "A computer vision toolkit for developers and researchers.",

            creator: "Origyn AI",

            price: "₹4,999",

            image: "ML"

        },


        "CloudForge": {

            category: "WEB TECHNOLOGY",

            description:
                "Tools for building and deploying modern web applications faster.",

            creator: "Origyn Cloud",

            price: "₹1,499",

            image: "WEB"

        }

    };


    // ========================================================
    // CATEGORY HELPERS
    // ========================================================

    function getCategoryKey(category) {

        const value =
            String(category || "")
                .toLowerCase();


        if (
            value.includes("ai") ||
            value.includes("artificial") ||
            value.includes("machine learning")
        ) {

            return "ai";

        }


        if (value.includes("hardware")) {

            return "hardware";

        }


        if (value.includes("software")) {

            return "software";

        }


        if (
            value.includes("iot") ||
            value.includes("web")
        ) {

            return "iot";

        }


        return "all";

    }


    // ========================================================
    // HERO INTRO
    // ========================================================

    const intro = gsap.timeline();


    intro

        .from(".logo", {

            y: -30,
            opacity: 0,
            duration: 1,
            ease: "power3.out"

        })


        .from(".nav-links a", {

            y: -20,
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power3.out"

        }, "-=0.5")


        .from("#home h1", {

            y: 80,
            opacity: 0,
            duration: 1,
            ease: "power3.out"

        })


        .from("#home p", {

            y: 40,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out"

        });


    gsap.set(".nav-links a", {

        opacity: 1,
        visibility: "visible"

    });


    // ========================================================
    // HERO BUTTON ANIMATIONS
    // ========================================================

    if (qs("#explore-btn")) {

        gsap.fromTo(

            "#explore-btn",

            {
                y: 30,
                opacity: 0
            },

            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                delay: 1.8,
                ease: "power3.out"
            }

        );

    }


    if (qs("#sell-btn")) {

        gsap.fromTo(

            "#sell-btn",

            {
                y: 30,
                opacity: 0
            },

            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                delay: 2,
                ease: "power3.out"
            }

        );

    }


    // ========================================================
    // DISCOVER HEADING
    // ========================================================

    if (
        qs("#discover") &&
        qs("#discover .section-heading")
    ) {

        gsap.from(

            "#discover .section-heading",

            {

                y: 100,
                opacity: 0,
                duration: 1,

                scrollTrigger: {

                    trigger: "#discover",
                    start: "top 80%",
                    toggleActions:
                        "play none none reverse"

                }

            }

        );

    }


    // ========================================================
    // PRODUCT CARD ANIMATION
    // ========================================================

    if (qs(".product-grid")) {

        const cardTimeline =
            gsap.timeline({

                scrollTrigger: {

                    trigger: ".product-grid",
                    start: "top 80%",
                    toggleActions:
                        "play none none reverse"

                }

            });


        cardTimeline.from(

            ".product-card",

            {

                opacity: 0,
                duration: 0.8,
                stagger: 0.5,
                ease: "power3.out"

            }

        );

    }


    // ========================================================
    // DISCOVER CARDS
    // ========================================================

    if (
        qs("#discover") &&
        qsa(".discover-card").length
    ) {

        gsap.from(

            ".discover-card",

            {

                opacity: 0,
                duration: 0.7,
                stagger: 0.2,
                ease: "power3.out",

                scrollTrigger: {

                    trigger: "#discover",
                    start: "top 70%",
                    toggleActions:
                        "play none none reverse"

                }

            }

        );

    }


    // ========================================================
    // STORY SCENE
    // ========================================================

    const storyScene =
        qs("#story");


    if (
        storyScene &&
        typeof ScrollTrigger !== "undefined"
    ) {


        ScrollTrigger.create({

            trigger: "#story",
            start: "top top",
            end: "+=2000",
            pin: true

        });


        // ----------------------------------------------------
        // DELIVERY MAN
        // ----------------------------------------------------

        if (qs(".delivery-man")) {

            gsap.to(

                ".delivery-man",

                {

                    x: 500,

                    scrollTrigger: {

                        trigger: "#story",
                        start: "top top",
                        end: "+=2000",
                        scrub: 1

                    }

                }

            );

        }


        // ----------------------------------------------------
        // DELIVERY BOX
        // ----------------------------------------------------

        if (qs(".delivery-box")) {

            gsap.to(

                ".delivery-box",

                {

                    x: 500,

                    scrollTrigger: {

                        trigger: "#story",
                        start: "top top",
                        end: "+=2000",
                        scrub: 1

                    }

                }

            );

        }


        // ----------------------------------------------------
        // WALKING
        // ----------------------------------------------------

        const walking =
            gsap.timeline({

                repeat: -1,
                paused: true

            });


        if (qs(".delivery-man")) {

            walking

                .to(

                    ".delivery-man",

                    {

                        y: -8,
                        rotation: 3,
                        duration: 0.25,
                        ease: "power1.inOut"

                    }

                )

                .to(

                    ".delivery-man",

                    {

                        y: 0,
                        rotation: -3,
                        duration: 0.25,
                        ease: "power1.inOut"

                    }

                );


            ScrollTrigger.create({

                trigger: "#story",
                start: "top top",
                end: "+=2000",

                onEnter: () =>
                    walking.play(),

                onLeave: () =>
                    walking.pause(),

                onEnterBack: () =>
                    walking.play(),

                onLeaveBack: () =>
                    walking.pause()

            });

        }


        // ----------------------------------------------------
        // COLLISION
        // ----------------------------------------------------

        const collision =
            gsap.timeline({

                paused: true

            });


        if (qs(".delivery-man")) {

            collision

                .to(

                    ".delivery-man",

                    {

                        rotation: -8,
                        x: "+=20",
                        duration: 0.2

                    }

                )

                .to(

                    ".delivery-man",

                    {

                        rotation: 8,
                        x: "-=10",
                        duration: 0.2

                    }

                )

                .to(

                    ".delivery-man",

                    {

                        rotation: -15,
                        y: 25,
                        duration: 0.25

                    }

                );


            let collisionTriggered = false;


            ScrollTrigger.create({

                trigger: "#story",
                start: "top top",
                end: "+=2000",

                onUpdate: (self) => {

                    if (
                        self.progress > 0.45 &&
                        !collisionTriggered
                    ) {

                        collisionTriggered = true;

                        walking.pause();

                        collision.play();

                    }

                }

            });

        }


        // ----------------------------------------------------
        // BOX OPEN
        // ----------------------------------------------------

        const boxOpen =
            gsap.timeline({

                paused: true

            });


        if (qs(".delivery-box")) {

            boxOpen

                .to(

                    ".delivery-box",

                    {

                        rotation: -15,
                        scale: 1.15,
                        duration: 0.25,
                        ease: "power2.out"

                    }

                )

                .to(

                    ".delivery-box",

                    {

                        rotation: 15,
                        scale: 1,
                        duration: 0.25,
                        ease: "power2.inOut"

                    }

                );


            let boxTriggered = false;


            ScrollTrigger.create({

                trigger: "#story",
                start: "top top",
                end: "+=2000",

                onUpdate: (self) => {

                    if (
                        self.progress > 0.70 &&
                        !boxTriggered
                    ) {

                        boxTriggered = true;

                        boxOpen.play();

                    }

                }

            });

        }


        // ----------------------------------------------------
        // TECHNOLOGY REVEAL
        // ----------------------------------------------------

        const techReveal =
            gsap.timeline({

                paused: true

            });


        if (qsa(".tech-item").length) {

            techReveal.fromTo(

                ".tech-item",

                {

                    y: 40,
                    opacity: 0,
                    scale: 0.8

                },

                {

                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.6,
                    stagger: 0.2,
                    ease: "back.out(1.7)"

                }

            );


            let techTriggered = false;


            ScrollTrigger.create({

                trigger: "#story",
                start: "top top",
                end: "+=2000",

                onUpdate: (self) => {

                    if (
                        self.progress > 0.82 &&
                        !techTriggered
                    ) {

                        techTriggered = true;

                        techReveal.play();

                    }

                }

            });

        }

    }


    // ========================================================
    // SELL SECTION
    // ========================================================

    if (
        qs("#sell") &&
        qs(".sell-content")
    ) {

        gsap.from(

            ".sell-content",

            {

                x: -50,
                opacity: 0,
                duration: 0.8,
                ease: "power3.out",

                scrollTrigger: {

                    trigger: "#sell",
                    start: "top 70%",
                    toggleActions:
                        "play none none reverse"

                }

            }

        );

    }


    if (
        qs(".sell-steps") &&
        qsa(".sell-step").length
    ) {

        gsap.from(

            ".sell-step",

            {

                opacity: 0,
                duration: 0.7,
                stagger: 0.2,
                ease: "power3.out",

                scrollTrigger: {

                    trigger: ".sell-steps",
                    start: "top 75%",
                    toggleActions:
                        "play none none reverse"

                }

            }

        );

    }


    // ========================================================
    // START SELLING
    // ========================================================

    const startSellingButton =
        qs("#start-selling-btn");


    if (startSellingButton) {

        startSellingButton.addEventListener(

            "click",

            () => {

                const submitTech =
                    qs("#submit-tech");


                if (submitTech) {

                    submitTech.scrollIntoView({

                        behavior: "smooth",
                        block: "start"

                    });

                }

            }

        );

    }


    // ========================================================
    // FORM ELEMENTS
    // ========================================================

    const techForm =
        qs("#tech-form");


    const formMessage =
        qs("#form-message");


    const listingPreview =
        qs("#listing-preview");


    const previewName =
        qs("#preview-name");


    const previewCategory =
        qs("#preview-category");


    const previewDescription =
        qs("#preview-description");


    const previewPrice =
        qs("#preview-price");


    const previewCreator =
        qs("#preview-creator");


    const previewImage =
        qs("#preview-image");


    const publishListingButton =
        qs("#publish-listing-btn");


    const categoryNames = {

        ai: "AI / ML",
        hardware: "HARDWARE",
        software: "SOFTWARE",
        iot: "IOT / WEB"

    };


    if (listingPreview) {

        listingPreview.style.display =
            "none";

    }


    // ========================================================
    // PREVIEW LISTING
    // ========================================================

    if (techForm) {

        techForm.addEventListener(

            "submit",

            (event) => {

                event.preventDefault();


                const nameInput =
                    qs("#tech-name");


                const categoryInput =
                    qs("#tech-category");


                const descriptionInput =
                    qs("#tech-description");


                const priceInput =
                    qs("#tech-price");


                const creatorInput =
                    qs("#tech-creator");


                if (
                    !nameInput ||
                    !categoryInput ||
                    !descriptionInput ||
                    !priceInput ||
                    !creatorInput
                ) {

                    console.error(
                        "Technology form fields are missing."
                    );

                    return;

                }


                const name =
                    nameInput.value.trim();


                const category =
                    categoryInput.value;


                const description =
                    descriptionInput.value.trim();


                const price =
                    priceInput.value;


                const creator =
                    creatorInput.value.trim();


                // --------------------------------------------
                // UPDATE PREVIEW
                // --------------------------------------------

                if (previewName) {

                    previewName.textContent =
                        name;

                }


                if (previewCategory) {

                    previewCategory.textContent =
                        categoryNames[category] ||
                        "TECHNOLOGY";

                }


                if (previewDescription) {

                    previewDescription.textContent =
                        description;

                }


                if (previewPrice) {

                    previewPrice.textContent =
                        `₹${Number(price).toLocaleString("en-IN")}`;

                }


                if (previewCreator) {

                    previewCreator.textContent =
                        creator;

                }


                // --------------------------------------------
                // PREVIEW IMAGE
                // --------------------------------------------

                if (previewImage) {

                    if (category === "ai") {

                        previewImage.textContent =
                            "AI";

                    }

                    else if (category === "hardware") {

                        previewImage.textContent =
                            "HW";

                    }

                    else if (category === "software") {

                        previewImage.textContent =
                            "SW";

                    }

                    else {

                        previewImage.textContent =
                            "IOT";

                    }

                }


                // --------------------------------------------
                // SHOW PREVIEW
                // --------------------------------------------

                if (listingPreview) {

                    listingPreview.style.display =
                        "block";


                    gsap.fromTo(

                        listingPreview,

                        {

                            opacity: 0,
                            y: 30

                        },

                        {

                            opacity: 1,
                            y: 0,
                            duration: 0.6,
                            ease: "power3.out"

                        }

                    );

                }


                if (formMessage) {

                    formMessage.textContent =
                        "Your listing preview is ready.";


                    gsap.fromTo(

                        formMessage,

                        {

                            opacity: 0,
                            y: 10

                        },

                        {

                            opacity: 1,
                            y: 0,
                            duration: 0.5,
                            ease: "power3.out"

                        }

                    );

                }

            }

        );

    }


    // ========================================================
    // PRODUCT DETAIL ELEMENTS
    // ========================================================

    const productDetails =
        qs("#product-details");


    const backToMarketplace =
        qs("#back-to-marketplace");


    const detailImage =
        qs("#detail-image");


    const detailCategory =
        qs("#detail-category");


    const detailName =
        qs("#detail-name");


    const detailDescription =
        qs("#detail-description");


    const detailCreator =
        qs("#detail-creator");


    const detailPrice =
        qs("#detail-price");


    // ========================================================
    // SHOW PRODUCT DETAILS
    // ========================================================

    function showProductDetails(
        productName,
        product
    ) {

        if (!product) {

            console.warn(
                `No product data found for "${productName}".`
            );

            return;

        }


        if (detailImage) {

            detailImage.textContent =
                product.image;

        }


        if (detailCategory) {

            detailCategory.textContent =
                product.category;

        }


        if (detailName) {

            detailName.textContent =
                productName;

        }


        if (detailDescription) {

            detailDescription.textContent =
                product.description;

        }


        if (detailCreator) {

            detailCreator.textContent =
                product.creator;

        }


        if (detailPrice) {

            detailPrice.textContent =
                product.price;

        }


        const discover =
            qs("#discover");


        if (discover) {

            discover.style.display =
                "none";

        }


        if (productDetails) {

            productDetails.style.display =
                "flex";


            productDetails.scrollIntoView({

                behavior: "smooth",
                block: "start"

            });

        }


        if (qs(".product-detail-image")) {

            gsap.fromTo(

                ".product-detail-image",

                {

                    x: -80,
                    opacity: 0

                },

                {

                    x: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: "power3.out"

                }

            );

        }


        if (qs(".product-detail-info")) {

            gsap.fromTo(

                ".product-detail-info",

                {

                    x: 80,
                    opacity: 0

                },

                {

                    x: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: "power3.out"

                }

            );

        }

    }


    // ========================================================
    // PRODUCT CARD CREATION
    // ========================================================

    function createProductCard(
        productName,
        product
    ) {

        const productGrid =
            qs(".product-grid");


        if (!productGrid) {

            return null;

        }


        const card =
            document.createElement("article");


        card.className =
            "product-card";


        card.dataset.category =
            getCategoryKey(product.category);


        card.dataset.persistent =
            "true";


        card.innerHTML = `
    <div class="product-image">
        ${product.image || "TECH"}

        <button
            type="button"
            class="favorite-product-btn"
            data-product="${productName}"
            aria-label="Add ${productName} to favorites"
        >
            ${isOrigynFavorite(productName) ? "♥" : "♡"}
        </button>
    </div>

            <div class="product-content">

                <p class="product-category">
                    ${product.category || "TECHNOLOGY"}
                </p>

                <h3>
                    ${productName}
                </h3>

                <p>
                    ${product.description || ""}
                </p>

                <div class="product-bottom">
    <strong>
        ${product.price || "₹0"}
    </strong>

    <div class="product-actions">
        <a href="#">
            View Product →
        </a>

        <button
            type="button"
            class="add-to-cart-btn"
            data-product="${productName}"
        >
            Add to Cart
        </button>
    </div>
</div>

            </div>

        `;


        productGrid.appendChild(card);


        return card;

    }


    // ========================================================
    // PREPARE EXISTING CARDS FOR FILTERING
    // ========================================================

    function prepareExistingProductCards() {

        qsa(".product-card").forEach(

            (card) => {

                if (
                    card.dataset.category
                ) {

                    return;

                }


                const nameElement =
                    card.querySelector("h3");


                if (!nameElement) {

                    return;

                }


                const name =
                    nameElement.textContent.trim();


                const product =
                    productData[name];


                if (product) {

                    card.dataset.category =
                        getCategoryKey(
                            product.category
                        );

                }

                else {

                    const categoryElement =
                        card.querySelector(
                            ".product-category"
                        );


                    card.dataset.category =
                        getCategoryKey(

                            categoryElement
                                ? categoryElement.textContent
                                : ""

                        );

                }

            }

        );

    }


    // ========================================================
    // LOAD SAVED PRODUCTS
    // ========================================================

    function loadSavedProducts() {

        const savedProducts =
            getSavedProducts();


        if (!savedProducts.length) {

            return;

        }


        savedProducts.forEach(

            (product) => {

                if (
                    !product ||
                    !product.name
                ) {

                    return;

                }


                // Add to runtime data

                productData[
                    product.name
                ] = {

                    category:
                        product.category ||
                        "TECHNOLOGY",

                    description:
                        product.description ||
                        "",

                    creator:
                        product.creator ||
                        "Creator",

                    price:
                        product.price ||
                        "₹0",

                    image:
                        product.image ||
                        "TECH"

                };


                // Don't duplicate if already in HTML

                const alreadyExists =
                    Array.from(
                        qsa(".product-card")
                    ).some(

                        (card) => {

                            const heading =
                                card.querySelector("h3");

                            return heading &&
                                heading.textContent
                                    .trim() ===
                                product.name;

                        }

                    );


                if (alreadyExists) {

                    return;

                }


                const card =
                    createProductCard(

                        product.name,

                        productData[
                            product.name
                        ]

                    );


                if (card) {

                    card.style.opacity =
                        "1";

                    card.style.transform =
                        "none";

                }

            }

        );

    }

// ========================================================
// CART SYSTEM
// ========================================================

const CART_STORAGE_KEY = "origynCart";

function getCart() {
    try {
        return JSON.parse(
            localStorage.getItem(CART_STORAGE_KEY)
        ) || [];
    } catch (error) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cart)
    );
}

function addToCart(productName) {

    const product = productData[productName];

    if (!product) {
        console.error("Product not found:", productName);
        return;
    }

    const cart = getCart();

    const existingItem = cart.find(
        item => item.name === productName
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: productName,
            category: product.category || "TECHNOLOGY",
            description: product.description || "",
            creator: product.creator || "Creator",
            price: product.price || "₹0",
            image: product.image || "TECH",
            quantity: 1
        });
    }

    saveCart(cart);
    updateCartCount();

    console.log("Added to cart:", productName);
}

function updateCartCount() {

    const cart = getCart();

    const count = cart.reduce(
        (total, item) =>
            total + Number(item.quantity || 0),
        0
    );

    let cartCounter =
        document.querySelector("#cart-count");

    if (!cartCounter) {

        cartCounter = document.createElement("span");

        cartCounter.id = "cart-count";

        cartCounter.style.cssText = `
            position: fixed;
            right: 25px;
            bottom: 25px;
            z-index: 9999;
            background: #111;
            color: white;
            padding: 10px 14px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            pointer-events: none;
        `;

        document.body.appendChild(cartCounter);
    }

    cartCounter.textContent =
        `Cart ${count}`;

    cartCounter.style.display =
        count > 0 ? "block" : "none";
}


// Handle Add to Cart buttons
document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                ".add-to-cart-btn"
            );

        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        const productName =
            button.dataset.product;

        if (!productName) return;

        addToCart(productName);

        const originalText =
            button.textContent;

        button.textContent =
            "Added ✓";

        button.disabled = true;

        setTimeout(() => {

            button.textContent =
                originalText;

            button.disabled = false;

        }, 1000);
    }
);


// Restore cart count after refresh
updateCartCount();
// ========================================================
// CART DRAWER
// ========================================================

const cartButton = document.querySelector("#cart-button");
const cartDrawer = document.querySelector("#cart-drawer");
const closeCartButton = document.querySelector("#close-cart");
const cartItemsContainer = document.querySelector("#cart-items");
const cartTotalElement = document.querySelector("#cart-total");
const cartButtonCount = document.querySelector("#cart-button-count");


function getPriceNumber(price) {
    return Number(
        String(price)
            .replace(/[₹,\s]/g, "")
    ) || 0;
}


function renderCart() {

    const cart = getCart();

    if (!cartItemsContainer) return;

    if (!cart.length) {

        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <p>Your cart is empty.</p>
                <span>Add some technology from the marketplace.</span>
            </div>
        `;

        if (cartTotalElement) {
            cartTotalElement.textContent = "₹0";
        }

        if (cartButtonCount) {
            cartButtonCount.textContent = "0";
        }

        return;
    }


    let total = 0;
    let itemCount = 0;


    cartItemsContainer.innerHTML = cart.map(
        (item, index) => {

            const price =
                getPriceNumber(item.price);

            const quantity =
                Number(item.quantity) || 1;

            total += price * quantity;
            itemCount += quantity;


            return `
                <div class="cart-item">

                    <div class="cart-item-info">

                        <h3>
                            ${item.name}
                        </h3>

                        <p>
                            ${item.creator || "Creator"}
                        </p>

                        <div class="cart-item-controls">

                            <button
                                type="button"
                                data-cart-action="decrease"
                                data-cart-index="${index}"
                            >
                                −
                            </button>

                            <strong>
                                ${quantity}
                            </strong>

                            <button
                                type="button"
                                data-cart-action="increase"
                                data-cart-index="${index}"
                            >
                                +
                            </button>

                            <button
                                type="button"
                                data-cart-action="remove"
                                data-cart-index="${index}"
                            >
                                Remove
                            </button>

                        </div>

                    </div>

                    <div class="cart-item-price">
                        ₹${(price * quantity).toLocaleString("en-IN")}
                    </div>

                </div>
            `;
        }
    ).join("");


    if (cartTotalElement) {
        cartTotalElement.textContent =
            `₹${total.toLocaleString("en-IN")}`;
    }

    if (cartButtonCount) {
        cartButtonCount.textContent =
            itemCount;
    }
}


// OPEN CART

if (cartButton) {

    cartButton.addEventListener(
        "click",
        () => {

            renderCart();

            cartDrawer?.classList.add("active");

        }
    );

}


// CLOSE CART

if (closeCartButton) {

    closeCartButton.addEventListener(
        "click",
        () => {

            cartDrawer?.classList.remove("active");

        }
    );

}


// CART CONTROLS

if (cartItemsContainer) {

    cartItemsContainer.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "[data-cart-action]"
                );

            if (!button) return;


            const index =
                Number(
                    button.dataset.cartIndex
                );

            const action =
                button.dataset.cartAction;


            const cart = getCart();

            if (!cart[index]) return;


            if (action === "increase") {

                cart[index].quantity += 1;

            }


            if (action === "decrease") {

                cart[index].quantity -= 1;

                if (cart[index].quantity <= 0) {

                    cart.splice(index, 1);

                }

            }


            if (action === "remove") {

                cart.splice(index, 1);

            }


            saveCart(cart);

            updateCartCount();

            renderCart();

        }
    );

}


// Initial render

renderCart();
    // ========================================================
    // VIEW PRODUCT
    // ========================================================

    document.addEventListener(

        "click",

        (event) => {

            const productLink =
                event.target.closest(
                    ".product-bottom a"
                );


            if (!productLink) {

                return;

            }


            event.preventDefault();
            event.stopPropagation();


            const card =
                productLink.closest(
                    ".product-card"
                );


            if (!card) {

                return;

            }


            const nameElement =
                card.querySelector("h3");


            if (!nameElement) {

                return;

            }


            const productName =
                nameElement.textContent.trim();


            let product =
                productData[
                    productName
                ];


            // ------------------------------------------------
            // Fallback for unknown cards
            // ------------------------------------------------

            if (!product) {

                const categoryElement =
                    card.querySelector(
                        ".product-category"
                    );


                const descriptionElement =
                    card.querySelector(
                        ".product-content > p:not(.product-category)"
                    );


                const priceElement =
                    card.querySelector(
                        ".product-bottom strong"
                    );


                const imageElement =
                    card.querySelector(
                        ".product-image"
                    );


                product = {

                    category:
                        categoryElement
                            ? categoryElement.textContent.trim()
                            : "TECHNOLOGY",

                    description:
                        descriptionElement
                            ? descriptionElement.textContent.trim()
                            : "",

                    creator:
                        "Creator",

                    price:
                        priceElement
                            ? priceElement.textContent.trim()
                            : "₹0",

                    image:
                        imageElement
                            ? imageElement.textContent.trim()
                            : "TECH"

                };

            }


            showProductDetails(

                productName,

                product

            );

        }

    );


    // ========================================================
    // BACK TO MARKETPLACE
    // ========================================================

    if (backToMarketplace) {

        backToMarketplace.addEventListener(

            "click",

            (event) => {

                event.preventDefault();


                if (productDetails) {

                    productDetails.style.display =
                        "none";

                }


                const discover =
                    qs("#discover");


                if (discover) {

                    discover.style.display =
                        "block";


                    discover.scrollIntoView({

                        behavior: "smooth",
                        block: "start"

                    });

                }


                if (
                    typeof ScrollTrigger !==
                    "undefined"
                ) {

                    ScrollTrigger.refresh();

                }

            }

        );

    }


    // ========================================================
    // PUBLISH LISTING
    // ========================================================

    if (publishListingButton) {

        publishListingButton.addEventListener(

            "click",

            (event) => {

                event.preventDefault();
                event.stopPropagation();


                const productGrid =
                    qs(".product-grid");


                if (!productGrid) {

                    console.error(
                        "Product grid not found."
                    );

                    return;

                }


                // --------------------------------------------
                // READ PREVIEW
                // --------------------------------------------

                const name =
                    previewName
                        ? previewName.textContent.trim()
                        : "Untitled Technology";


                const category =
                    previewCategory
                        ? previewCategory.textContent.trim()
                        : "TECHNOLOGY";


                const description =
                    previewDescription
                        ? previewDescription.textContent.trim()
                        : "";


                const price =
                    previewPrice
                        ? previewPrice.textContent.trim()
                        : "₹0";


                const creator =
                    previewCreator
                        ? previewCreator.textContent.trim()
                        : "Creator";


                const image =
                    previewImage
                        ? previewImage.textContent.trim()
                        : "TECH";


                // --------------------------------------------
                // VALIDATE
                // --------------------------------------------

                if (!name || name === "Your Technology") {

                    if (formMessage) {

                        formMessage.textContent =
                            "Please enter a technology name.";

                    }

                    return;

                }


                // --------------------------------------------
                // BUILD PRODUCT
                // --------------------------------------------

                const newProduct = {

                    name,

                    category,

                    description,

                    creator,

                    price,

                    image,

                    dataCategory:
                        getCategoryKey(category)

                };


                // --------------------------------------------
                // SAVE TO LOCAL STORAGE
                // --------------------------------------------

                const savedProducts =
                    getSavedProducts();


                const existingIndex =
                    savedProducts.findIndex(

                        (product) =>
                            product.name
                                .toLowerCase() ===
                            name.toLowerCase()

                    );


                if (existingIndex !== -1) {

                    savedProducts[
                        existingIndex
                    ] = newProduct;

                }

                else {

                    savedProducts.push(
                        newProduct
                    );

                }


                saveProducts(
                    savedProducts
                );


                // --------------------------------------------
                // UPDATE RUNTIME DATA
                // --------------------------------------------

                productData[name] = {

                    category,

                    description,

                    creator,

                    price,

                    image

                };


                // --------------------------------------------
                // CHECK FOR EXISTING CARD
                // --------------------------------------------

                let newCard = null;


                const existingCard =
                    Array.from(
                        qsa(".product-card")
                    ).find(

                        (card) => {

                            const heading =
                                card.querySelector("h3");


                            return heading &&
                                heading.textContent
                                    .trim()
                                    .toLowerCase() ===
                                name.toLowerCase();

                        }

                    );


                // --------------------------------------------
                // CREATE OR UPDATE
                // --------------------------------------------

                if (existingCard) {

                    newCard =
                        existingCard;


                    newCard.dataset.category =
                        getCategoryKey(
                            category
                        );


                    const categoryElement =
                        newCard.querySelector(
                            ".product-category"
                        );


                    const descriptionElement =
                        newCard.querySelector(
                            ".product-content > p:not(.product-category)"
                        );


                    const priceElement =
                        newCard.querySelector(
                            ".product-bottom strong"
                        );


                    const imageElement =
                        newCard.querySelector(
                            ".product-image"
                        );


                    if (categoryElement) {

                        categoryElement.textContent =
                            category;

                    }


                    if (descriptionElement) {

                        descriptionElement.textContent =
                            description;

                    }


                    if (priceElement) {

                        priceElement.textContent =
                            price;

                    }


                    if (imageElement) {

                        imageElement.textContent =
                            image;

                    }

                }

                else {

                    newCard =
                        createProductCard(

                            name,

                            productData[name]

                        );

                }


                // --------------------------------------------
                // ANIMATE NEW CARD
                // --------------------------------------------

                if (newCard) {

                    gsap.fromTo(

                        newCard,

                        {

                            opacity: 0,
                            y: 40,
                            scale: 0.96

                        },

                        {

                            opacity: 1,
                            y: 0,
                            scale: 1,
                            duration: 0.7,
                            ease: "power3.out"

                        }

                    );

                }


                // --------------------------------------------
                // SUCCESS MESSAGE
                // --------------------------------------------

                if (formMessage) {

                    formMessage.textContent =
                        "Your technology is now live on Origyn.";


                    gsap.fromTo(

                        formMessage,

                        {

                            opacity: 0,
                            y: 10

                        },

                        {

                            opacity: 1,
                            y: 0,
                            duration: 0.5,
                            ease: "power3.out"

                        }

                    );

                }


                // --------------------------------------------
                // HIDE PREVIEW
                // --------------------------------------------

                if (listingPreview) {

                    listingPreview.style.display =
                        "none";

                }


                // --------------------------------------------
                // RESET FORM
                // --------------------------------------------

                if (techForm) {

                    techForm.reset();

                }


                // --------------------------------------------
                // SCROLL TO MARKETPLACE
                // --------------------------------------------

                const discover =
                    qs("#discover");


                if (discover) {

                    setTimeout(

                        () => {

                            discover.scrollIntoView({

                                behavior: "smooth",
                                block: "start"

                            });

                        },

                        150

                    );

                }


                // --------------------------------------------
                // REFRESH GSAP
                // --------------------------------------------

                if (
                    typeof ScrollTrigger !==
                    "undefined"
                ) {

                    setTimeout(

                        () => {

                            ScrollTrigger.refresh();

                        },

                        300

                    );

                }

            }

        );

    }


    // ========================================================
    // CONTACT SECTION
    // ========================================================

    if (
        qs("#contact") &&
        qs(".contact-content")
    ) {

        gsap.from(

            ".contact-content",

            {

                y: 80,
                opacity: 0,
                duration: 1,
                ease: "power3.out",

                scrollTrigger: {

                    trigger: "#contact",
                    start: "top 75%",
                    toggleActions:
                        "play none none reverse"

                }

            }

        );

    }


    // ========================================================
    // ABOUT SECTION
    // ========================================================

    if (
        qs("#about") &&
        qs(".about-heading")
    ) {

        const aboutTimeline =
            gsap.timeline({

                scrollTrigger: {

                    trigger: "#about",
                    start: "top 70%",
                    toggleActions:
                        "play none none reverse"

                }

            });


        aboutTimeline

            .from(

                ".about-heading",

                {

                    x: -70,
                    opacity: 0,
                    duration: 0.8,
                    ease: "power3.out"

                }

            )

            .from(

                ".about-text",

                {

                    y: 50,
                    opacity: 0,
                    duration: 0.7,
                    ease: "power3.out"

                },

                "-=0.4"

            )

            .from(

                ".about-stat",

                {

                    y: 50,
                    opacity: 0,
                    duration: 0.6,
                    stagger: 0.2,
                    ease: "power3.out"

                },

                "-=0.3"

            );

    }


    // ========================================================
    // SMOOTH NAVIGATION
    // ========================================================

    qsa(".nav-links a").forEach(

        (link) => {

            link.addEventListener(

                "click",

                (event) => {

                    const targetId =
                        link.getAttribute(
                            "href"
                        );


                    if (
                        targetId &&
                        targetId.startsWith("#")
                    ) {

                        const target =
                            qs(targetId);


                        if (target) {

                            event.preventDefault();


                            target.scrollIntoView({

                                behavior: "smooth",
                                block: "start"

                            });

                        }

                    }

                }

            );

        }

    );


    // ========================================================
    // HERO BUTTONS
    // ========================================================

    const exploreButton =
        qs("#explore-btn");


    if (exploreButton) {

        exploreButton.addEventListener(

            "click",

            (event) => {

                event.preventDefault();


                const discover =
                    qs("#discover");


                if (discover) {

                    discover.scrollIntoView({

                        behavior: "smooth",
                        block: "start"

                    });

                }

            }

        );

    }


    const sellButton =
        qs("#sell-btn");


    if (sellButton) {

        sellButton.addEventListener(

            "click",

            (event) => {

                event.preventDefault();


                const sell =
                    qs("#sell");


                if (sell) {

                    sell.scrollIntoView({

                        behavior: "smooth",
                        block: "start"

                    });

                }

            }

        );

    }


    // ========================================================
    // MARKETPLACE SEARCH & FILTER
    // ========================================================

    const searchInput =
        qs("#product-search");


    const filterButtons =
        qsa(".filter-btn");


    let activeCategory =
        "all";


    function filterProducts() {

        const searchTerm =
            searchInput
                ? searchInput.value
                    .toLowerCase()
                    .trim()
                : "";


        qsa(".product-card").forEach(

            (card) => {

                const category =
                    card.dataset.category ||
                    "all";


                const text =
                    card.textContent
                        .toLowerCase();


                const matchesCategory =
                    activeCategory === "all" ||
                    category === activeCategory;


                const matchesSearch =
                    text.includes(
                        searchTerm
                    );


                if (
                    matchesCategory &&
                    matchesSearch
                ) {

                    card.classList.remove(
                        "hidden"
                    );


                    gsap.fromTo(

                        card,

                        {

                            opacity: 0,
                            y: 20

                        },

                        {

                            opacity: 1,
                            y: 0,
                            duration: 0.4,
                            ease: "power2.out"

                        }

                    );

                }

                else {

                    card.classList.add(
                        "hidden"
                    );

                }

            }

        );

    }


    // ========================================================
    // CATEGORY BUTTONS
    // ========================================================

    filterButtons.forEach(

        (button) => {

            button.addEventListener(

                "click",

                () => {

                    filterButtons.forEach(

                        (btn) => {

                            btn.classList.remove(
                                "active"
                            );

                        }

                    );


                    button.classList.add(
                        "active"
                    );


                    activeCategory =
                        button.dataset.category ||
                        "all";


                    filterProducts();

                }

            );

        }

    );


    // ========================================================
    // SEARCH
    // ========================================================

    if (searchInput) {

        searchInput.addEventListener(

            "input",

            () => {

                filterProducts();

            }

        );

    }


    // ========================================================
    // INITIALIZE EXISTING PRODUCTS
    // ========================================================

    prepareExistingProductCards();


    // ========================================================
    // LOAD PERSISTENT PRODUCTS
    // ========================================================

    loadSavedProducts();


    // ========================================================
    // FINAL FILTER SETUP
    // ========================================================

    filterProducts();


    // ========================================================
    // FINAL SCROLLTRIGGER REFRESH
    // ========================================================

    if (
        typeof ScrollTrigger !==
        "undefined"
    ) {

        window.addEventListener(

            "load",

            () => {

                ScrollTrigger.refresh();

            }

        );

    }

});
/* =========================================================
   ORIGYN — FAVORITES SYSTEM
   ========================================================= */

const ORIGYN_FAVORITES_KEY = "origynFavorites";

let origynFavorites =
    JSON.parse(localStorage.getItem(ORIGYN_FAVORITES_KEY)) || [];


/* ---------------------------------------------------------
   SAVE FAVORITES
--------------------------------------------------------- */

function saveOrigynFavorites() {

    localStorage.setItem(
        ORIGYN_FAVORITES_KEY,
        JSON.stringify(origynFavorites)
    );

}


/* ---------------------------------------------------------
   UPDATE FAVORITES COUNT
--------------------------------------------------------- */

function updateFavoritesCount() {

    const favoritesCount =
        document.querySelector("#favorites-count");

    if (!favoritesCount) return;

    favoritesCount.textContent =
        origynFavorites.length;

}


/* ---------------------------------------------------------
   CHECK IF PRODUCT IS FAVORITED
--------------------------------------------------------- */

function isOrigynFavorite(productName) {

    return origynFavorites.includes(productName);

}


/* ---------------------------------------------------------
   TOGGLE FAVORITE
--------------------------------------------------------- */

function toggleOrigynFavorite(productName, button) {

    if (isOrigynFavorite(productName)) {

        origynFavorites =
            origynFavorites.filter(
                name => name !== productName
            );

        button.classList.remove("active");

        button.textContent = "♡";

    } else {

        origynFavorites.push(productName);

        button.classList.add("active");

        button.textContent = "♥";

    }


    saveOrigynFavorites();

    updateFavoritesCount();

}


/* ---------------------------------------------------------
   FAVORITE BUTTON EVENTS
--------------------------------------------------------- */

document.addEventListener("click", (event) => {

    const favoriteButton =
        event.target.closest(".favorite-product-btn");

    if (!favoriteButton) return;


    event.preventDefault();

    event.stopPropagation();


    const productName =
        favoriteButton.dataset.product;


    if (!productName) return;


    toggleOrigynFavorite(
        productName,
        favoriteButton
    );

});


/* ---------------------------------------------------------
   INITIAL COUNT
--------------------------------------------------------- */

updateFavoritesCount();
/* =========================================================
   ORIGYN — CART SYSTEM
   ========================================================= */

const ORIGYN_CART_KEY = "origynCart";

let origynCart =
    JSON.parse(localStorage.getItem(ORIGYN_CART_KEY)) || [];


/* ---------------------------------------------------------
   SAVE CART
--------------------------------------------------------- */

function saveOrigynCart() {

    localStorage.setItem(
        ORIGYN_CART_KEY,
        JSON.stringify(origynCart)
    );

}


/* ---------------------------------------------------------
   UPDATE CART COUNT
--------------------------------------------------------- */

function updateCartCount() {

    const cartCount =
        document.querySelector("#cart-count");

    if (!cartCount) return;

    cartCount.textContent =
        origynCart.length;

}


/* ---------------------------------------------------------
   CHECK IF PRODUCT IS IN CART
--------------------------------------------------------- */

function isOrigynInCart(productName) {

    return origynCart.some(
        item => item.name === productName
    );

}


/* ---------------------------------------------------------
   ADD PRODUCT TO CART
--------------------------------------------------------- */

function addOrigynToCart(productName, product) {

    if (!product) return;

    if (isOrigynInCart(productName)) {

        return;

    }

    origynCart.push({

        name: productName,

        category: product.category || "TECHNOLOGY",

        description: product.description || "",

        creator: product.creator || "Creator",

        price: product.price || "₹0",

        image: product.image || "TECH"

    });


    saveOrigynCart();

    updateCartCount();

}


/* ---------------------------------------------------------
   INITIAL CART COUNT
--------------------------------------------------------- */

updateCartCount();