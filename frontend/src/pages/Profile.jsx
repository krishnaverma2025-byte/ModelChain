import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting user:", error);
        setLoading(false);
        return;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    getUser();
  }, [navigate]);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const createdDate = new Date(user.created_at).toLocaleDateString();

  return (
    <div className="profile-page">

      <div className="profile-card">

        <div className="profile-header">
          <div className="profile-avatar">
            {user.email?.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1>My Profile</h1>
            <p>Manage your MontAI account</p>
          </div>
        </div>

        <div className="profile-details">

          <div className="profile-detail">
            <span className="detail-label">Email</span>
            <span className="detail-value">
              {user.email}
            </span>
          </div>

          <div className="profile-detail">
            <span className="detail-label">User ID</span>
            <span className="detail-value user-id">
              {user.id}
            </span>
          </div>

          <div className="profile-detail">
            <span className="detail-label">Account created</span>
            <span className="detail-value">
              {createdDate}
            </span>
          </div>

        </div>

        <div className="profile-actions">

          <button
            className="profile-back-button"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>

        </div>

      </div>

    </div>
  );
}

export default Profile;