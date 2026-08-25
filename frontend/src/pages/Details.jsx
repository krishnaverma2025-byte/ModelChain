import { Link, useParams } from "react-router-dom";

const modelData = {
  "vision-ai": {
    name: "Vision AI",
    category: "Computer Vision",
    price: "0.05 ETH",
    description:
      "Advanced computer vision model for image recognition and analysis.",
    creator: "AI Research Labs",
  },

  textmind: {
    name: "TextMind",
    category: "Natural Language",
    price: "0.08 ETH",
    description:
      "Powerful language model designed for intelligent text generation.",
    creator: "Neural Systems",
  },

  predictx: {
    name: "PredictX",
    category: "Predictive AI",
    price: "0.04 ETH",
    description:
      "Machine learning model for predictive analytics and forecasting.",
    creator: "Predictive Labs",
  },
};

function ModelDetails() {
  const { id } = useParams();

  const model = modelData[id];

  if (!model) {
    return (
      <div style={styles.page}>
        <h1>Model Not Found</h1>

        <Link to="/marketplace" style={styles.button}>
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link to="/" style={styles.logo}>
          MontAI
        </Link>

        <nav style={styles.nav}>
          <Link to="/" style={styles.navLink}>
            Home
          </Link>
          <Link to="/marketplace" style={styles.navLink}>
            Marketplace
          </Link>
          <Link to="/upload" style={styles.navLink}>
            Upload Model
          </Link>
          <Link to="/dashboard" style={styles.navLink}>
            Dashboard
          </Link>
        </nav>

        <Link to="/login" style={styles.login}>
          Login
        </Link>
      </header>

      <main style={styles.container}>
        <Link to="/marketplace" style={styles.back}>
          ← Back to Marketplace
        </Link>

        <div style={styles.content}>
          <div style={styles.icon}>AI</div>

          <div style={styles.badge}>{model.category}</div>

          <h1 style={styles.title}>{model.name}</h1>

          <p style={styles.description}>{model.description}</p>

          <div style={styles.creator}>
            <span>Created by</span>
            <strong>{model.creator}</strong>
          </div>

          <div style={styles.purchaseBox}>
            <div>
              <span style={styles.priceLabel}>License Price</span>
              <div style={styles.price}>{model.price}</div>
            </div>

            <button style={styles.buyButton}>
              License Model
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#08090d",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    height: "88px",
    borderBottom: "1px solid #24252d",
    display: "flex",
    alignItems: "center",
    padding: "0 5%",
  },

  logo: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "26px",
    fontWeight: "800",
  },

  nav: {
    display: "flex",
    gap: "45px",
    margin: "0 auto",
  },

  navLink: {
    color: "#c8c9d4",
    textDecoration: "none",
  },

  login: {
    background: "#7040f5",
    color: "#fff",
    padding: "15px 28px",
    borderRadius: "12px",
    textDecoration: "none",
    fontWeight: "700",
  },

  container: {
    width: "75%",
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "70px 0",
  },

  back: {
    color: "#9b72ff",
    textDecoration: "none",
  },

  content: {
    marginTop: "50px",
    background: "#0d0e14",
    border: "1px solid #292b35",
    borderRadius: "22px",
    padding: "55px",
  },

  icon: {
    width: "90px",
    height: "90px",
    background: "#6840ed",
    borderRadius: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    fontWeight: "800",
  },

  badge: {
    color: "#9b72ff",
    marginTop: "35px",
    fontWeight: "700",
  },

  title: {
    fontSize: "60px",
    margin: "15px 0",
  },

  description: {
    color: "#9da0b4",
    fontSize: "20px",
    lineHeight: "1.7",
    maxWidth: "750px",
  },

  creator: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "35px",
    color: "#9da0b4",
  },

  purchaseBox: {
    marginTop: "50px",
    padding: "30px",
    border: "1px solid #30323d",
    borderRadius: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  priceLabel: {
    color: "#9da0b4",
  },

  price: {
    fontSize: "28px",
    fontWeight: "800",
    marginTop: "8px",
  },

  buyButton: {
    background: "#7040f5",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "17px 30px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },

  button: {
    color: "#fff",
  },
};

export default ModelDetails;