import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Edit3, Trash2, X } from "lucide-react";
import { db } from "../firebase";
import type { Product } from "../pages/types/Product";

type ProductForm = {
  name: string;
  category: string;
  price: string;
  oldPrice: string;
  image: string;
  stock: string;
};

const emptyForm: ProductForm = {
  name: "",
  category: "",
  price: "",
  oldPrice: "",
  image: "",
  stock: "10",
};

function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  }

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const firestoreProducts = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as Product[];

        setProducts(firestoreProducts);
      },
      (error) => {
        console.error("Could not load admin products:", error);
        showMessage("Could not load products.");
      }
    );

    return unsubscribe;
  }, []);

  function updateForm(
    field: keyof ProductForm,
    value: string
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function startEdit(product: Product) {
    setEditingProductId(product.id);

    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      oldPrice: product.oldPrice ? String(product.oldPrice) : "",
      image: product.image,
      stock: String(product.stock),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingProductId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);

      const productData = {
        name: form.name.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        image: form.image.trim(),
        stock: Number(form.stock),
        updatedAt: serverTimestamp(),
      };

      if (editingProductId) {
        await updateDoc(
          doc(db, "products", editingProductId),
          productData
        );

        showMessage("Product updated successfully!");
      } else {
        await addDoc(collection(db, "products"), {
          ...productData,
          createdAt: serverTimestamp(),
        });

        showMessage("Product added successfully!");
      }

      cancelEdit();
    } catch (error) {
      console.error("Could not save product:", error);
      showMessage("Could not save product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const shouldDelete = window.confirm(
      `Delete "${product.name}"? This action cannot be undone.`
    );

    if (!shouldDelete) return;

    try {
      await deleteDoc(doc(db, "products", product.id));
      showMessage("Product deleted successfully!");
    } catch (error) {
      console.error("Could not delete product:", error);
      showMessage("Could not delete product. Please try again.");
    }
  }

  return (
    <main className="admin-page">
      <section className="container admin-layout">
        <div className="admin-form-card">
          <div className="admin-title">
            <div>
              <p className="eyebrow">Admin dashboard</p>
              <h1>{editingProductId ? "Edit Product" : "Add Product"}</h1>
            </div>

            {editingProductId && (
              <button
                className="icon-button"
                onClick={cancelEdit}
                aria-label="Cancel editing"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Product name</label>
              <input
                id="name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Classic Leather Watch"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <input
                id="category"
                value={form.category}
                onChange={(event) =>
                  updateForm("category", event.target.value)
                }
                placeholder="Watches"
                required
              />
            </div>

            <div className="admin-two-columns">
              <div className="form-group">
                <label htmlFor="price">Price (USD)</label>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => updateForm("price", event.target.value)}
                  placeholder="79.99"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="oldPrice">Old price</label>
                <input
                  id="oldPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.oldPrice}
                  onChange={(event) =>
                    updateForm("oldPrice", event.target.value)
                  }
                  placeholder="99.99"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="stock">Stock</label>
              <input
                id="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => updateForm("stock", event.target.value)}
                placeholder="10"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="image">Image URL</label>
              <input
                id="image"
                type="url"
                value={form.image}
                onChange={(event) => updateForm("image", event.target.value)}
                placeholder="https://images.unsplash.com/..."
                required
              />
            </div>

            <div className="admin-form-actions">
              <button className="form-button" type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : editingProductId
                    ? "Update Product"
                    : "Add Product"}
              </button>

              {editingProductId && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {message && <p className="message">{message}</p>}
        </div>

        <section className="admin-products-section">
          <div className="admin-products-heading">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2>Manage products</h2>
            </div>

            <span>{products.length} products</span>
          </div>

          {products.length === 0 && (
            <p className="products-status">No products added yet.</p>
          )}

          <div className="admin-products-list">
            {products.map((product) => (
              <article className="admin-product-row" key={product.id}>
                <img src={product.image} alt={product.name} />

                <div className="admin-product-info">
                  <p>{product.category}</p>
                  <h3>{product.name}</h3>
                  <span>
                    ${product.price.toFixed(2)} · {product.stock} in stock
                  </span>
                </div>

                <div className="admin-product-actions">
                  <button
                    className="admin-edit-button"
                    onClick={() => startEdit(product)}
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>

                  <button
                    className="admin-delete-button"
                    onClick={() => handleDelete(product)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default Admin;