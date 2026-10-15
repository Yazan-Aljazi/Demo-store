import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";

import { auth, db } from "./firebase";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import type { CartItem, Product, WishlistItem } from "./pages/types/Product";

type Page =
  | "home"
  | "login"
  | "register"
  | "products"
  | "product-details"
  | "cart"
  | "wishlist"
  | "orders"
  | "admin";

interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  status: "pending";
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<"admin" | "customer" | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const categories = useMemo(() => {
    const allCategories = products.map((product) => product.category);
    return ["All", ...Array.from(new Set(allCategories))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ),
    [cartItems]
  );

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (userDocument) => {
        const userData = userDocument.data();
        setRole(userData?.role === "admin" ? "admin" : "customer");
      },
      () => setRole("customer")
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const firestoreProducts = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as Product[];

        setProducts(firestoreProducts);
        setProductsLoading(false);
      },
      () => setProductsLoading(false)
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setCartItems([]);
      setCartLoading(false);
      return;
    }

    setCartLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "cart"),
      (snapshot) => {
        const firestoreCartItems = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as CartItem[];

        setCartItems(firestoreCartItems);
        setCartLoading(false);
      },
      () => setCartLoading(false)
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setWishlistItems([]);
      setWishlistLoading(false);
      return;
    }

    setWishlistLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "wishlist"),
      (snapshot) => {
        const firestoreWishlistItems = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as WishlistItem[];

        setWishlistItems(firestoreWishlistItems);
        setWishlistLoading(false);
      },
      () => setWishlistLoading(false)
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "orders"),
      (snapshot) => {
        const firestoreOrders = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as Order[];

        setOrders(firestoreOrders);
        setOrdersLoading(false);
      },
      () => setOrdersLoading(false)
    );

    return unsubscribe;
  }, [user]);

  async function handleLogout() {
    await signOut(auth);
    setPage("home");
    setMenuOpen(false);
  }

  function navigateTo(nextPage: Page) {
    setPage(nextPage);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openProductDetails(product: Product) {
    setSelectedProduct(product);
    navigateTo("product-details");
  }

  function goToCategory(category: string) {
    setSelectedCategory(category);
    setSearchTerm("");
    navigateTo("products");
  }

  function isInWishlist(productId: string) {
    return wishlistItems.some((item) => item.id === productId);
  }

  async function toggleWishlist(product: Product) {
    if (!user) {
      showMessage("Please sign in before adding products to your wishlist.");
      navigateTo("login");
      return;
    }

    const wishlistReference = doc(
      db,
      "users",
      user.uid,
      "wishlist",
      product.id
    );

    try {
      if (isInWishlist(product.id)) {
        await deleteDoc(wishlistReference);
        showMessage(`${product.name} was removed from your wishlist.`);
      } else {
        await setDoc(wishlistReference, {
          name: product.name,
          category: product.category,
          price: product.price,
          oldPrice: product.oldPrice,
          image: product.image,
          stock: product.stock,
          addedAt: serverTimestamp(),
        });

        showMessage(`${product.name} was added to your wishlist.`);
      }
    } catch {
      showMessage("Could not update wishlist. Please try again.");
    }
  }

  async function handleAddToCart(product: Product) {
    if (!user) {
      showMessage("Please sign in before adding products to your cart.");
      navigateTo("login");
      return;
    }

    try {
      const cartItemRef = doc(db, "users", user.uid, "cart", product.id);
      const existingItem = cartItems.find((item) => item.id === product.id);

      await setDoc(
        cartItemRef,
        {
          name: product.name,
          category: product.category,
          price: product.price,
          oldPrice: product.oldPrice,
          image: product.image,
          stock: product.stock,
          quantity: existingItem ? existingItem.quantity + 1 : 1,
          addedAt: serverTimestamp(),
        },
        { merge: true }
      );

      showMessage(`${product.name} was added to your cart.`);
    } catch {
      showMessage("Could not add this product. Please try again.");
    }
  }

  async function increaseQuantity(item: CartItem) {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid, "cart", item.id), {
        quantity: item.quantity + 1,
      });
    } catch {
      showMessage("Could not update quantity.");
    }
  }

  async function decreaseQuantity(item: CartItem) {
    if (!user) return;

    try {
      const cartItemRef = doc(db, "users", user.uid, "cart", item.id);

      if (item.quantity === 1) {
        await deleteDoc(cartItemRef);
        showMessage(`${item.name} was removed from your cart.`);
        return;
      }

      await updateDoc(cartItemRef, {
        quantity: item.quantity - 1,
      });
    } catch {
      showMessage("Could not update quantity.");
    }
  }

  async function removeFromCart(item: CartItem) {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "cart", item.id));
      showMessage(`${item.name} was removed from your cart.`);
    } catch {
      showMessage("Could not remove this product.");
    }
  }

  async function checkout() {
    if (!user || cartItems.length === 0) return;

    try {
      const batch = writeBatch(db);
      const orderReference = doc(collection(db, "users", user.uid, "orders"));

      batch.set(orderReference, {
        items: cartItems,
        subtotal,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      cartItems.forEach((item) => {
        batch.delete(doc(db, "users", user.uid, "cart", item.id));
      });

      await batch.commit();

      showMessage("Order placed successfully!");
      navigateTo("orders");
    } catch {
      showMessage("Could not place your order. Please try again.");
    }
  }

  function renderProductCard(product: Product) {
    const saved = isInWishlist(product.id);

    return (
      <article className="product-card" key={product.id}>
        <button
          className="product-image-wrap product-image-button"
          onClick={() => openProductDetails(product)}
          aria-label={`Open ${product.name}`}
        >
          <img src={product.image} alt={product.name} />
          {product.oldPrice && <span className="sale-badge">Sale</span>}
        </button>

        <button
          className={saved ? "wishlist-button saved" : "wishlist-button"}
          onClick={() => toggleWishlist(product)}
          aria-label="Add to wishlist"
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>

        <div className="product-info">
          <p>{product.category}</p>

          <button
            className="product-name-button"
            onClick={() => openProductDetails(product)}
          >
            {product.name}
          </button>

          <div className="product-price">
            <strong>${product.price.toFixed(2)}</strong>
            {product.oldPrice && <span>${product.oldPrice.toFixed(2)}</span>}
          </div>

          <button
            className="add-button"
            onClick={() => handleAddToCart(product)}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? "Out of stock" : "Add to cart"}
          </button>
        </div>
      </article>
    );
  }

  function renderProducts(productList: Product[] = products) {
    if (productsLoading) {
      return <p className="products-status">Loading products...</p>;
    }

    if (productList.length === 0) {
      return <p className="products-status">No products found.</p>;
    }

    return productList.map(renderProductCard);
  }

  if (loading) {
    return <div className="loading-screen">Loading My Store...</div>;
  }

  return (
    <div className="app">
     
       <header className="site-header">
        <button className="brand" onClick={() => navigateTo("home")}>
          Luma<span>STORE</span>
        </button>

        <nav className={menuOpen ? "main-nav open" : "main-nav"}>
          <button onClick={() => navigateTo("home")}>Home</button>
          <button onClick={() => navigateTo("products")}>Shop</button>

          {user && (
            <button onClick={() => navigateTo("orders")}>My Orders</button>
          )}

          {role === "admin" && (
            <button onClick={() => navigateTo("admin")}>Admin</button>
          )}

          <button onClick={() => goToCategory("All")}>Categories</button>
          <button onClick={() => navigateTo("home")}>About</button>
        </nav>

        <div className="header-actions">
          <button
            className="icon-button desktop-search"
            aria-label="Search"
            onClick={() => navigateTo("products")}
          >
            <Search size={20} />
          </button>

          {user ? (
            <button
              className="icon-button"
              title={user.email ?? "Account"}
              aria-label="My orders"
              onClick={() => navigateTo("orders")}
            >
              <UserRound size={20} />
            </button>
          ) : (
            <button
              className="icon-button"
              onClick={() => navigateTo("login")}
              aria-label="Sign in"
            >
              <UserRound size={20} />
            </button>
          )}

          <button
            className="icon-button wishlist-header-button"
            onClick={() => navigateTo("wishlist")}
            aria-label="Wishlist"
          >
            <Heart size={20} />

            {wishlistItems.length > 0 && (
              <span className="cart-badge">{wishlistItems.length}</span>
            )}
          </button>

          <button
            className="icon-button cart-button"
            onClick={() => navigateTo("cart")}
            aria-label="Shopping cart"
          >
            <ShoppingBag size={20} />

            {cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
          </button>

          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {user && (
        <div className="signed-in-bar">
          Signed in as <strong>{user.email}</strong>
          <button onClick={handleLogout}>Sign out</button>
        </div>
      )}
  

      {message && <div className="toast-message">{message}</div>}

      {page === "home" && (
        <>
          <section className="hero-section">
            <div className="hero-content">
              <p className="eyebrow">New season, new essentials</p>
              <h1>Find your everyday favorite.</h1>

              <p className="hero-text">
                Curated pieces for a simple, modern lifestyle — made to fit
                beautifully into every day.
              </p>

              <button
                className="primary-button"
                onClick={() => navigateTo("products")}
              >
                Shop the collection
              </button>
            </div>

            <div className="hero-image-wrap">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=85"
                alt="Fashion collection"
              />
            </div>
          </section>

          <section className="benefits-section">
            <article>
              <span>01</span>
              <div>
                <h3>Curated quality</h3>
                <p>Products selected for design, utility, and everyday value.</p>
              </div>
            </article>

            <article>
              <span>02</span>
              <div>
                <h3>Secure checkout</h3>
                <p>Your payments and personal information stay protected.</p>
              </div>
            </article>

            <article>
              <span>03</span>
              <div>
                <h3>Easy returns</h3>
                <p>Simple support when something is not quite right.</p>
              </div>
            </article>
          </section>

          <section className="section container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Explore</p>
                <h2>Shop by category</h2>
              </div>

              <button
                className="text-button"
                onClick={() => navigateTo("products")}
              >
                View all products →
              </button>
            </div>

            <div className="category-grid">
              <button
                className="category-card"
                onClick={() => goToCategory("Watches")}
              >
                <img
                  src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80"
                  alt="Watches"
                />
                <span>Watches</span>
              </button>

              <button
                className="category-card"
                onClick={() => goToCategory("Bags")}
              >
                <img
                  src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80"
                  alt="Bags"
                />
                <span>Bags</span>
              </button>

              <button
                className="category-card"
                onClick={() => goToCategory("Electronics")}
              >
                <img
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80"
                  alt="Electronics"
                />
                <span>Electronics</span>
              </button>

              <button
                className="category-card"
                onClick={() => goToCategory("Fashion")}
              >
                <img
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=700&q=80"
                  alt="Fashion"
                />
                <span>Fashion</span>
              </button>
            </div>
          </section>

          <section className="section container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Just in</p>
                <h2>Featured products</h2>
              </div>

              <button
                className="text-button"
                onClick={() => navigateTo("products")}
              >
                Shop all →
              </button>
            </div>

            <div className="products-grid">
              {renderProducts(products.slice(0, 4))}
            </div>
          </section>

          <section className="newsletter-section">
            <div>
              <p className="eyebrow">Stay in the loop</p>
              <h2>New arrivals, special offers, no noise.</h2>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                showMessage("Thanks for subscribing!");
                event.currentTarget.reset();
              }}
            >
              <input type="email" placeholder="Your email address" required />
              <button type="submit">Subscribe</button>
            </form>
          </section>
        </>
      )}

      {page === "products" && (
        <section className="container page-section">
          <p className="eyebrow">The collection</p>
          <h1>All products</h1>
          <p className="page-description">
            Browse, search, and find what fits your style.
          </p>

          <div className="shop-toolbar">
            <div className="search-input-wrap">
              <Search size={19} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search products..."
              />
            </div>

            <div className="category-filters">
              {categories.map((category) => (
                <button
                  key={category}
                  className={
                    selectedCategory === category
                      ? "filter-button active"
                      : "filter-button"
                  }
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <p className="results-count">
            {filteredProducts.length} product
            {filteredProducts.length === 1 ? "" : "s"} found
          </p>

          <div className="products-grid">{renderProducts(filteredProducts)}</div>
        </section>
      )}

      {page === "product-details" && selectedProduct && (
        <section className="container page-section">
          <button
            className="back-button"
            onClick={() => navigateTo("products")}
          >
            <ArrowLeft size={18} />
            Back to shop
          </button>

          <div className="product-details-layout">
            <div className="product-details-image">
              <img src={selectedProduct.image} alt={selectedProduct.name} />
            </div>

            <div className="product-details-info">
              <p className="eyebrow">{selectedProduct.category}</p>
              <h1>{selectedProduct.name}</h1>

              <div className="details-price">
                <strong>${selectedProduct.price.toFixed(2)}</strong>
                {selectedProduct.oldPrice && (
                  <span>${selectedProduct.oldPrice.toFixed(2)}</span>
                )}
              </div>

              <p className="details-description">
                A carefully selected piece designed for everyday use. Quality,
                comfort, and simple style come together in this product.
              </p>

              <p className="stock-text">
                {selectedProduct.stock > 0
                  ? `${selectedProduct.stock} items available`
                  : "Out of stock"}
              </p>

              <div className="details-actions">
                <button
                  className="primary-button details-add-button"
                  onClick={() => handleAddToCart(selectedProduct)}
                  disabled={selectedProduct.stock === 0}
                >
                  <ShoppingBag size={18} />
                  {selectedProduct.stock === 0
                    ? "Out of stock"
                    : "Add to cart"}
                </button>

                <button
                  className={
                    isInWishlist(selectedProduct.id)
                      ? "details-wishlist-button saved"
                      : "details-wishlist-button"
                  }
                  onClick={() => toggleWishlist(selectedProduct)}
                  aria-label="Add to wishlist"
                >
                  <Heart
                    size={20}
                    fill={
                      isInWishlist(selectedProduct.id) ? "currentColor" : "none"
                    }
                  />
                  {isInWishlist(selectedProduct.id)
                    ? "Saved"
                    : "Save to wishlist"}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {page === "wishlist" && (
        <section className="container page-section">
          <p className="eyebrow">Your account</p>
          <h1>Wishlist</h1>
          <p className="page-description">
            Save your favorite products and come back to them anytime.
          </p>

          {!user && (
            <div className="cart-empty">
              <h2>Please sign in first</h2>
              <p>Sign in to save your favorite products.</p>

              <button
                className="primary-button"
                onClick={() => navigateTo("login")}
              >
                Sign in
              </button>
            </div>
          )}

          {user && wishlistLoading && (
            <p className="page-description">Loading your wishlist...</p>
          )}

          {user && !wishlistLoading && wishlistItems.length === 0 && (
            <div className="cart-empty">
              <h2>Your wishlist is empty</h2>
              <p>Tap the heart icon on a product to save it here.</p>

              <button
                className="primary-button"
                onClick={() => navigateTo("products")}
              >
                Explore products
              </button>
            </div>
          )}

          {user && !wishlistLoading && wishlistItems.length > 0 && (
            <div className="products-grid">{renderProducts(wishlistItems)}</div>
          )}
        </section>
      )}

      {page === "cart" && (
        <section className="container page-section">
          <p className="eyebrow">Shopping bag</p>
          <h1>Your cart</h1>

          {cartLoading && (
            <p className="page-description">Loading your cart...</p>
          )}

          {!cartLoading && !user && (
            <div className="cart-empty">
              <h2>Please sign in first</h2>
              <p>Your cart is saved to your account.</p>

              <button
                className="primary-button"
                onClick={() => navigateTo("login")}
              >
                Sign in
              </button>
            </div>
          )}

          {!cartLoading && user && cartItems.length === 0 && (
            <div className="cart-empty">
              <h2>Your cart is empty</h2>
              <p>Explore the collection and add something you love.</p>

              <button
                className="primary-button"
                onClick={() => navigateTo("products")}
              >
                Continue shopping
              </button>
            </div>
          )}

          {!cartLoading && user && cartItems.length > 0 && (
            <div className="cart-layout">
              <div className="cart-list">
                {cartItems.map((item) => (
                  <article className="cart-item" key={item.id}>
                    <img src={item.image} alt={item.name} />

                    <div className="cart-item-info">
                      <p>{item.category}</p>
                      <h3>{item.name}</h3>
                      <strong>${item.price.toFixed(2)}</strong>

                      <button
                        className="remove-button"
                        onClick={() => removeFromCart(item)}
                      >
                        <Trash2 size={15} />
                        Remove
                      </button>
                    </div>

                    <div className="quantity-control">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() => decreaseQuantity(item)}
                      >
                        <Minus size={15} />
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        aria-label="Increase quantity"
                        onClick={() => increaseQuantity(item)}
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <strong className="cart-item-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </strong>
                  </article>
                ))}
              </div>

              <aside className="cart-summary">
                <h2>Order summary</h2>

                <div>
                  <span>Subtotal</span>
                  <strong>${subtotal.toFixed(2)}</strong>
                </div>

                <div>
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>

                <hr />

                <div className="summary-total">
                  <strong>Total</strong>
                  <strong>${subtotal.toFixed(2)}</strong>
                </div>

                <button
                  className="primary-button checkout-button"
                  onClick={checkout}
                >
                  Proceed to checkout
                </button>
              </aside>
            </div>
          )}
        </section>
      )}

      {page === "orders" && (
        <section className="container page-section">
          <p className="eyebrow">Your account</p>
          <h1>My orders</h1>

          {!user && (
            <div className="cart-empty">
              <h2>Please sign in first</h2>
              <p>Sign in to view your orders.</p>

              <button
                className="primary-button"
                onClick={() => navigateTo("login")}
              >
                Sign in
              </button>
            </div>
          )}

          {user && ordersLoading && (
            <p className="page-description">Loading your orders...</p>
          )}

          {user && !ordersLoading && orders.length === 0 && (
            <div className="cart-empty">
              <h2>No orders yet</h2>
              <p>Your placed orders will appear here.</p>

              <button
                className="primary-button"
                onClick={() => navigateTo("products")}
              >
                Start shopping
              </button>
            </div>
          )}

          {user && !ordersLoading && orders.length > 0 && (
            <div className="orders-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <div>
                      <p>Order ID</p>
                      <h2>#{order.id.slice(0, 8).toUpperCase()}</h2>
                    </div>

                    <span className="order-status">
                      <CheckCircle2 size={15} />
                      {order.status}
                    </span>
                  </div>

                  <div className="order-items">
                    {order.items.map((item) => (
                      <div className="order-item" key={item.id}>
                        <img src={item.image} alt={item.name} />
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <strong>
                          ${(item.price * item.quantity).toFixed(2)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="order-total">
                    <span>Total</span>
                    <strong>${order.subtotal.toFixed(2)}</strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {page === "admin" && role === "admin" && <Admin />}

      {page === "admin" && role !== "admin" && (
        <section className="container page-section empty-page">
          <h1>Access denied</h1>
          <p>You do not have permission to access this page.</p>

          <button
            className="primary-button"
            onClick={() => navigateTo("home")}
          >
            Back to home
          </button>
        </section>
      )}

      {page === "login" && (
  <Login onCreateAccount={() => navigateTo("register")} />
)}

    {page === "register" && (
  <Register onSignIn={() => navigateTo("login")} />
)}

      <footer className="site-footer">
  <div className="footer-inner">
    <div className="footer-intro">
      <p className="footer-eyebrow">Let’s work together</p>
      <h2>Have a question about Nova Store?</h2>
      <p>
        Send a message and I’ll get back to you as soon as possible.
      </p>

      <a
        className="footer-email-link"
        href="mailto:YOUR_EMAIL@gmail.com"
      >
        YOUR_EMAIL@gmail.com
      </a>
    </div>

    <form className="contact-form" onSubmit={handleContactSubmit}>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="contact-name">Your name</label>
          <input
            id="contact-name"
            type="text"
            name="name"
            placeholder="John Smith"
            value={contactForm.name}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            autoComplete="name"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="contact-email">Your email</label>
          <input
            id="contact-email"
            type="email"
            name="email"
            placeholder="john@example.com"
            value={contactForm.email}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="contact-message">Your message</label>
        <textarea
          id="contact-message"
          name="message"
          placeholder="Tell me how I can help with your project..."
          rows={5}
          value={contactForm.message}
          onChange={(event) =>
            setContactForm((current) => ({
              ...current,
              message: event.target.value,
            }))
          }
          required
        />
      </div>

      <div className="contact-form-bottom">
        <button
          className="contact-submit"
          type="submit"
          disabled={contactStatus === "sending"}
        >
          {contactStatus === "sending" ? "Sending..." : "Send message"}
        </button>

        {contactStatus === "success" && (
          <p className="contact-status success" role="status">
            Thanks — your message was sent successfully.
          </p>
        )}

        {contactStatus === "error" && (
          <p className="contact-status error" role="alert">
            Something went wrong. Please try again or email me directly.
          </p>
        )}
      </div>
    </form>
  </div>

  <div className="footer-bottom">
    <p>Portfolio project — products, prices, and orders are for demonstration purposes only.</p>
    <p>© 2026 Nova Store. Built by Yazan Aljazi.</p>
  </div>
</footer>
  );
}

export default App;