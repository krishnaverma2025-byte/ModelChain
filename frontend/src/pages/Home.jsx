function Home() {
  return (
    <main className="hero">

      <div className="hero-badge">
        DECENTRALIZED AI MARKETPLACE
      </div>

      <h1>
        Own Your <span>AI License</span>
      </h1>

      <div className="hero-brand">
        Mont<span>AI</span>
      </div>

      <p className="hero-description">
        Discover and license AI models through transparent,
        blockchain-based
        <br />
        ownership and smart contracts.
      </p>

      <div className="hero-buttons">

        <a href="/marketplace" className="primary-button">
          Explore Models
        </a>

        <a href="/upload" className="secondary-button">
          List Your Model
        </a>

      </div>

    </main>
  );
}

export default Home;