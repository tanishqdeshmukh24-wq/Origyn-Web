/* =========================================================
   ORIGYN — COMPLETE SCRIPT
   Works with the HTML structure provided
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENT REFERENCES
    ===================================================== */

    const cartButton = document.getElementById("cart-button");
    const cartNav = document.getElementById("cart-nav");
    const closeCart = document.getElementById("close-cart");
    const cartDrawer = document.getElementById("cart-drawer");

    const cartItemsContainer = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total");
    const cartCount = document.getElementById("cart-count");
    const cartButtonCount = document.getElementById("cart-button-count");

    const checkoutBtn = document.getElementById("checkout-btn");
    const checkoutScreen = document.getElementById("checkout-screen");
    const backToCart = document.getElementById("back-to-cart");

    const checkoutItems = document.getElementById("checkout-items");
    const checkoutTotal = document.getElementById("checkout-total");

    const placeOrderBtn = document.getElementById("place-order-btn");

    const favoritesNav = document.getElementById("favorites-nav");
    const favoritesCount = document.getElementById("favorites-count");

    const exploreBtn = document.getElementById("explore-btn");
    const sellBtn = document.getElementById("sell-btn");
    const startSellingBtn = document.getElementById("start-selling-btn");

    const backToMarketplace =
        document.getElementById("back-to-marketplace");

    const getProductBtn =
        document.getElementById("get-product-btn");

    const productDetails =
        document.getElementById("product-details");

    const marketplace =
        document.getElementById("discover");

    const productSearch =
        document.getElementById("product-search");

    const filterButtons =
        document.querySelectorAll(".filter-btn");

    const productCards =
        document.querySelectorAll(".product-card");

    const techForm =
        document.getElementById("tech-form");

    const publishListingBtn =
        document.getElementById("publish-listing-btn");


    /* =====================================================
       DATA
    ===================================================== */

    let cart = [];

    let favorites = [];

    let selectedProduct = null;

    let currentCategory = "all";


    /* =====================================================
       PRODUCT DATA
    ===================================================== */

    const products = [
        {
            name: "NeuraVision AI",
            category: "ai",
            categoryName: "Artificial Intelligence",
            description:
                "An intelligent AI platform designed to automate everyday workflows.",
            price: 2499,
            creator: "Origyn Labs",
            image: "AI"
        },

        {
            name: "RoboArm X1",
            category: "hardware",
            categoryName: "Hardware",
            description:
                "A modular robotic arm built for automation and experimentation.",
            price: 18999,
            creator: "Origyn Labs",
            image: "HW"
        },

        {
            name: "DevFlow",
            category: "software",
            categoryName: "Software",
            description:
                "A developer productivity tool designed to simplify modern workflows.",
            price: 999,
            creator: "Origyn Labs",
            image: "SW"
        },

        {
            name: "HomeSense",
            category: "iot",
            categoryName: "IoT",
            description:
                "Smart sensors that bring intelligent automation to your home.",
            price: 3499,
            creator: "Origyn Labs",
            image: "IOT"
        },

        {
            name: "VisionCore",
            category: "ai",
            categoryName: "Machine Learning",
            description:
                "A computer vision toolkit for developers and researchers.",
            price: 4999,
            creator: "Origyn Labs",
            image: "ML"
        },

        {
            name: "CloudForge",
            category: "iot",
            categoryName: "Web Technology",
            description:
                "Tools for building and deploying modern web applications faster.",
            price: 1499,
            creator: "Origyn Labs",
            image: "WEB"
        }
    ];


    /* =====================================================
       HELPERS
    ===================================================== */

    function formatPrice(price) {
        return `₹${Number(price).toLocaleString("en-IN")}`;
    }


    function scrollToSection(id) {

        const section = document.getElementById(id);

        if (!section) return;

        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    /* =====================================================
       CART
    ===================================================== */

    function updateCart() {

        if (!cartItemsContainer) return;

        cartItemsContainer.innerHTML = "";

        let total = 0;
        let quantity = 0;

        if (cart.length === 0) {

            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <p>Your cart is empty.</p>
                    <span>Discover some technology to get started.</span>
                </div>
            `;

        } else {

            cart.forEach((item, index) => {

                total += item.price * item.quantity;
                quantity += item.quantity;

                const cartItem = document.createElement("div");

                cartItem.className = "cart-item";

                cartItem.innerHTML = `
                    <div class="cart-item-image">
                        ${item.image}
                    </div>

                    <div class="cart-item-info">

                        <h3>${item.name}</h3>

                        <p>${formatPrice(item.price)}</p>

                        <div class="cart-quantity">

                            <button
                                type="button"
                                class="quantity-btn"
                                data-index="${index}"
                                data-action="decrease"
                            >
                                −
                            </button>

                            <span>
                                ${item.quantity}
                            </span>

                            <button
                                type="button"
                                class="quantity-btn"
                                data-index="${index}"
                                data-action="increase"
                            >
                                +
                            </button>

                        </div>

                    </div>

                    <button
                        type="button"
                        class="remove-cart-item"
                        data-index="${index}"
                    >
                        ×
                    </button>
                `;

                cartItemsContainer.appendChild(cartItem);
            });
        }

        if (cartTotal) {
            cartTotal.textContent = formatPrice(total);
        }

        if (cartCount) {
            cartCount.textContent = quantity;
        }

        if (cartButtonCount) {
            cartButtonCount.textContent = quantity;
        }

        updateCheckout();
    }


    function addToCart(product) {

        if (!product) return;

        const existingItem = cart.find(
            item => item.name === product.name
        );

        if (existingItem) {

            existingItem.quantity += 1;

        } else {

            cart.push({
                ...product,
                quantity: 1
            });
        }

        updateCart();

        openCart();
    }


    function removeFromCart(index) {

        if (index < 0 || index >= cart.length) return;

        cart.splice(index, 1);

        updateCart();
    }


    function changeQuantity(index, change) {

        if (!cart[index]) return;

        cart[index].quantity += change;

        if (cart[index].quantity <= 0) {

            cart.splice(index, 1);
        }

        updateCart();
    }


    /* =====================================================
       OPEN / CLOSE CART
    ===================================================== */

    function openCart() {

        if (!cartDrawer) return;

        cartDrawer.classList.add("active");

        document.body.classList.add("cart-open");
    }


    function closeCartDrawer() {

        if (!cartDrawer) return;

        cartDrawer.classList.remove("active");

        document.body.classList.remove("cart-open");
    }


    /* =====================================================
       FLOATING CART BUTTON
       EXACT HTML ID: #cart-button
    ===================================================== */

    if (cartButton) {

        cartButton.addEventListener("click", (event) => {

            event.preventDefault();
            event.stopPropagation();

            openCart();
        });
    }


    /* =====================================================
       NAVBAR CART BUTTON
       EXACT HTML ID: #cart-nav
    ===================================================== */

    if (cartNav) {

        cartNav.addEventListener("click", (event) => {

            event.preventDefault();
            event.stopPropagation();

            openCart();
        });
    }


    /* =====================================================
       CLOSE CART
    ===================================================== */

    if (closeCart) {

        closeCart.addEventListener("click", (event) => {

            event.preventDefault();

            closeCartDrawer();
        });
    }


    /* =====================================================
       CART ITEM CONTROLS
    ===================================================== */

    if (cartItemsContainer) {

        cartItemsContainer.addEventListener("click", (event) => {

            const quantityButton =
                event.target.closest(".quantity-btn");

            const removeButton =
                event.target.closest(".remove-cart-item");


            if (quantityButton) {

                const index =
                    Number(quantityButton.dataset.index);

                const action =
                    quantityButton.dataset.action;

                if (action === "increase") {

                    changeQuantity(index, 1);

                } else if (action === "decrease") {

                    changeQuantity(index, -1);
                }

                return;
            }


            if (removeButton) {

                const index =
                    Number(removeButton.dataset.index);

                removeFromCart(index);
            }
        });
    }


    /* =====================================================
       CHECKOUT
    ===================================================== */

    function updateCheckout() {

        if (!checkoutItems || !checkoutTotal) return;

        checkoutItems.innerHTML = "";

        let total = 0;

        if (cart.length === 0) {

            checkoutItems.innerHTML = `
                <p class="empty-checkout">
                    Your cart is empty.
                </p>
            `;

        } else {

            cart.forEach(item => {

                total += item.price * item.quantity;

                const checkoutItem =
                    document.createElement("div");

                checkoutItem.className =
                    "checkout-item";

                checkoutItem.innerHTML = `
                    <div>
                        <strong>
                            ${item.name}
                        </strong>

                        <span>
                            × ${item.quantity}
                        </span>
                    </div>

                    <strong>
                        ${formatPrice(
                            item.price * item.quantity
                        )}
                    </strong>
                `;

                checkoutItems.appendChild(
                    checkoutItem
                );
            });
        }

        checkoutTotal.textContent =
            formatPrice(total);
    }


    /* =====================================================
       CONTINUE TO CHECKOUT
    ===================================================== */

    if (checkoutBtn) {

        checkoutBtn.addEventListener("click", () => {

            if (cart.length === 0) {

                alert("Your cart is empty.");

                return;
            }

            closeCartDrawer();

            if (checkoutScreen) {

                checkoutScreen.classList.add("active");

                checkoutScreen.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

            updateCheckout();
        });
    }


    /* =====================================================
       BACK TO CART
    ===================================================== */

    if (backToCart) {

        backToCart.addEventListener("click", () => {

            if (checkoutScreen) {
                checkoutScreen.classList.remove("active");
            }

            openCart();
        });
    }


    /* =====================================================
       PLACE ORDER
    ===================================================== */

    if (placeOrderBtn) {

        placeOrderBtn.addEventListener("click", () => {

            const name =
                document.getElementById("checkout-name");

            const email =
                document.getElementById("checkout-email");

            const address =
                document.getElementById("checkout-address");

            const city =
                document.getElementById("checkout-city");

            const pincode =
                document.getElementById("checkout-pincode");


            if (
                !name ||
                !email ||
                !address ||
                !city ||
                !pincode
            ) {
                return;
            }


            if (
                !name.value.trim() ||
                !email.value.trim() ||
                !address.value.trim() ||
                !city.value.trim() ||
                !pincode.value.trim()
            ) {

                alert(
                    "Please complete all delivery details."
                );

                return;
            }


            if (!/^\d{6}$/.test(pincode.value.trim())) {

                alert(
                    "Please enter a valid 6-digit PIN code."
                );

                return;
            }


            alert(
                `Order placed successfully!\n\nThank you, ${name.value.trim()}!`
            );


            cart = [];

            updateCart();

            checkoutScreen.classList.remove("active");

            name.value = "";
            email.value = "";
            address.value = "";
            city.value = "";
            pincode.value = "";

            scrollToSection("home");
        });
    }


    /* =====================================================
       FAVORITES
    ===================================================== */

    function updateFavorites() {

        if (favoritesCount) {

            favoritesCount.textContent =
                favorites.length;
        }
    }


    if (favoritesNav) {

        favoritesNav.addEventListener("click", () => {

            if (favorites.length === 0) {

                alert("You haven't added any favorites yet.");

                return;
            }

            alert(
                `You have ${favorites.length} favorite technology item(s).`
            );
        });
    }


    /* =====================================================
       HERO BUTTONS
    ===================================================== */

    if (exploreBtn) {

        exploreBtn.addEventListener("click", () => {

            scrollToSection("discover");
        });
    }


    if (sellBtn) {

        sellBtn.addEventListener("click", () => {

            scrollToSection("sell");
        });
    }


    if (startSellingBtn) {

        startSellingBtn.addEventListener("click", () => {

            scrollToSection("submit-tech");
        });
    }


    /* =====================================================
       PRODUCT DETAILS
    ===================================================== */

    function openProductDetails(product) {

        if (!product || !productDetails) return;

        selectedProduct = product;


        const detailImage =
            document.getElementById("detail-image");

        const detailCategory =
            document.getElementById("detail-category");

        const detailName =
            document.getElementById("detail-name");

        const detailDescription =
            document.getElementById("detail-description");

        const detailCreator =
            document.getElementById("detail-creator");

        const detailPrice =
            document.getElementById("detail-price");


        if (detailImage) {
            detailImage.textContent = product.image;
        }

        if (detailCategory) {
            detailCategory.textContent =
                product.categoryName.toUpperCase();
        }

        if (detailName) {
            detailName.textContent =
                product.name;
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
                formatPrice(product.price);
        }


        productDetails.classList.add("active");


        productDetails.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    /* =====================================================
       VIEW PRODUCT BUTTONS
    ===================================================== */

    productCards.forEach((card, index) => {

        const viewButton =
            card.querySelector(".product-bottom a");

        if (!viewButton) return;


        viewButton.addEventListener("click", (event) => {

            event.preventDefault();

            const product = products[index];

            openProductDetails(product);
        });
    });


    /* =====================================================
       GET THIS TECHNOLOGY
    ===================================================== */

    if (getProductBtn) {

        getProductBtn.addEventListener("click", () => {

            if (!selectedProduct) return;

            addToCart(selectedProduct);
        });
    }


    /* =====================================================
       BACK TO MARKETPLACE
    ===================================================== */

    if (backToMarketplace) {

        backToMarketplace.addEventListener("click", () => {

            if (productDetails) {

                productDetails.classList.remove("active");
            }

            scrollToSection("discover");
        });
    }


    /* =====================================================
       SEARCH
    ===================================================== */

    function filterProducts() {

        const searchTerm =
            productSearch
                ? productSearch.value
                    .trim()
                    .toLowerCase()
                : "";


        productCards.forEach(card => {

            const category =
                card.dataset.category || "";

            const text =
                card.textContent.toLowerCase();


            const categoryMatch =
                currentCategory === "all" ||
                category === currentCategory;


            const searchMatch =
                searchTerm === "" ||
                text.includes(searchTerm);


            if (categoryMatch && searchMatch) {

                card.style.display = "";

            } else {

                card.style.display = "none";
            }
        });
    }


    if (productSearch) {

        productSearch.addEventListener(
            "input",
            filterProducts
        );
    }


    /* =====================================================
       CATEGORY FILTERS
    ===================================================== */

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            filterButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            currentCategory =
                button.dataset.category || "all";

            filterProducts();
        });
    });


    /* =====================================================
       SELL / LISTING FORM
    ===================================================== */

    if (techForm) {

        techForm.addEventListener("submit", (event) => {

            event.preventDefault();


            const name =
                document.getElementById("tech-name").value.trim();

            const category =
                document.getElementById("tech-category").value;

            const description =
                document.getElementById("tech-description")
                    .value.trim();

            const price =
                Number(
                    document.getElementById("tech-price").value
                );

            const creator =
                document.getElementById("tech-creator")
                    .value.trim();


            if (
                !name ||
                !category ||
                !description ||
                !price ||
                !creator
            ) {

                showFormMessage(
                    "Please complete all fields."
                );

                return;
            }


            const categoryNames = {
                ai: "AI / ML",
                hardware: "Hardware",
                software: "Software",
                iot: "IoT / Web"
            };


            const imageLabels = {
                ai: "AI",
                hardware: "HW",
                software: "SW",
                iot: "IOT"
            };


            document.getElementById(
                "preview-image"
            ).textContent =
                imageLabels[category] || "TECH";


            document.getElementById(
                "preview-category"
            ).textContent =
                categoryNames[category] || "TECHNOLOGY";


            document.getElementById(
                "preview-name"
            ).textContent = name;


            document.getElementById(
                "preview-description"
            ).textContent = description;


            document.getElementById(
                "preview-price"
            ).textContent =
                formatPrice(price);


            document.getElementById(
                "preview-creator"
            ).textContent = creator;


            showFormMessage(
                "Preview updated successfully."
            );


            const preview =
                document.getElementById("listing-preview");

            if (preview) {

                preview.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }
        });
    }


    /* =====================================================
       FORM MESSAGE
    ===================================================== */

    function showFormMessage(message) {

        const formMessage =
            document.getElementById("form-message");

        if (!formMessage) return;

        formMessage.textContent = message;
    }


    /* =====================================================
       PUBLISH LISTING
    ===================================================== */

    if (publishListingBtn) {

        publishListingBtn.addEventListener("click", () => {

            const name =
                document.getElementById("tech-name");

            const category =
                document.getElementById("tech-category");

            const description =
                document.getElementById("tech-description");

            const price =
                document.getElementById("tech-price");

            const creator =
                document.getElementById("tech-creator");


            if (
                !name ||
                !category ||
                !description ||
                !price ||
                !creator
            ) {
                return;
            }


            if (
                !name.value.trim() ||
                !category.value ||
                !description.value.trim() ||
                !price.value ||
                !creator.value.trim()
            ) {

                alert(
                    "Please create a listing first."
                );

                return;
            }


            const categoryNames = {
                ai: "Artificial Intelligence",
                hardware: "Hardware",
                software: "Software",
                iot: "IoT / Web"
            };


            const imageLabels = {
                ai: "AI",
                hardware: "HW",
                software: "SW",
                iot: "IOT"
            };


            const newProduct = {

                name: name.value.trim(),

                category: category.value,

                categoryName:
                    categoryNames[category.value],

                description:
                    description.value.trim(),

                price:
                    Number(price.value),

                creator:
                    creator.value.trim(),

                image:
                    imageLabels[category.value]
            };


            products.push(newProduct);


            createProductCard(newProduct);


            alert(
                `${newProduct.name} has been published to the marketplace!`
            );


            techForm.reset();


            showFormMessage(
                "Listing published successfully."
            );


            scrollToSection("discover");
        });
    }


    /* =====================================================
       CREATE PRODUCT CARD
    ===================================================== */

    function createProductCard(product) {

        const grid =
            document.querySelector(".product-grid");

        if (!grid) return;


        const article =
            document.createElement("article");

        article.className =
            "product-card";

        article.dataset.category =
            product.category;


        article.innerHTML = `

            <div class="product-image">
                ${product.image}
            </div>

            <div class="product-content">

                <p class="product-category">
                    ${product.categoryName}
                </p>

                <h3>
                    ${product.name}
                </h3>

                <p>
                    ${product.description}
                </p>

                <div class="product-bottom">

                    <strong>
                        ${formatPrice(product.price)}
                    </strong>

                    <a href="#">
                        View Product →
                    </a>

                </div>

            </div>
        `;


        grid.appendChild(article);


        const viewButton =
            article.querySelector(".product-bottom a");


        if (viewButton) {

            viewButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openProductDetails(product);
                }
            );
        }
    }


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            closeCartDrawer();

            if (checkoutScreen) {
                checkoutScreen.classList.remove("active");
            }

            if (productDetails) {
                productDetails.classList.remove("active");
            }
        }
    });


    /* =====================================================
       INITIAL STATE
    ===================================================== */

    updateCart();

    updateFavorites();

    filterProducts();


    /* =====================================================
       GSAP
       Only run if GSAP actually loaded
    ===================================================== */

    if (typeof gsap !== "undefined") {

        if (typeof ScrollTrigger !== "undefined") {

            gsap.registerPlugin(ScrollTrigger);
        }


        /* Hero animation */

        gsap.from("#home h1", {
            opacity: 0,
            y: 40,
            duration: 1,
            ease: "power3.out"
        });


        gsap.from("#home p", {
            opacity: 0,
            y: 25,
            duration: 0.8,
            delay: 0.2,
            ease: "power3.out"
        });


        gsap.from(".hero-buttons button", {
            opacity: 0,
            y: 20,
            duration: 0.6,
            delay: 0.4,
            stagger: 0.1,
            ease: "power3.out"
        });


        /* Product cards */

        if (typeof ScrollTrigger !== "undefined") {

            gsap.from(".product-card", {

                opacity: 0,
                y: 40,
                duration: 0.7,
                stagger: 0.1,

                scrollTrigger: {
                    trigger: ".product-grid",
                    start: "top 85%"
                }
            });


            /* Story animation */

            gsap.from(".delivery-man", {

                x: -150,
                opacity: 0,
                duration: 1,

                scrollTrigger: {
                    trigger: "#story",
                    start: "top 75%"
                }
            });


            gsap.from(".delivery-box", {

                y: -80,
                opacity: 0,
                duration: 0.8,
                delay: 0.3,

                scrollTrigger: {
                    trigger: "#story",
                    start: "top 75%"
                }
            });


            gsap.from(".rock", {

                x: 80,
                opacity: 0,
                duration: 0.8,
                delay: 0.5,

                scrollTrigger: {
                    trigger: "#story",
                    start: "top 75%"
                }
            });


            gsap.from(".tech-item", {

                opacity: 0,
                scale: 0.5,
                duration: 0.6,
                stagger: 0.15,

                scrollTrigger: {
                    trigger: ".tech-reveal",
                    start: "top 80%"
                }
            });


            /* Sell steps */

            gsap.from(".sell-step", {

                opacity: 0,
                y: 30,
                duration: 0.6,
                stagger: 0.15,

                scrollTrigger: {
                    trigger: ".sell-steps",
                    start: "top 80%"
                }
            });
        }
    }


    /* =====================================================
       DEBUG MESSAGE
       Remove later if you want
    ===================================================== */

    console.log("Origyn script loaded successfully.");
    console.log("Floating cart:", cartButton);
    console.log("Navbar cart:", cartNav);

});