import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Profile.css";
import useIdentity from "../useIdentity";
import WalletGate from "../components/WalletGate";
import { CopyValue, NetworkBadge } from "../components/UI";
import { linkProfileWallet, logout } from "../identity";
import { errorText } from "../blockchain";

function Profile() {
  const identity = useIdentity();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const getProfile = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setLoading(false);
        return;
      }

      setUser(user);

      setFullName(user.user_metadata?.full_name || "");
      setAvatarUrl(user.user_metadata?.avatar_url || "");

      setLoading(false);
    };

    getProfile();
  }, [navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image must be smaller than 2MB.");
      return;
    }

    setSelectedFile(file);
    setMessage("");
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      let newAvatarUrl = avatarUrl;

      // Upload profile picture
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, selectedFile, {
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        newAvatarUrl = data.publicUrl;
      }

      // Update Supabase user metadata
      const { data: updatedUser, error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          avatar_url: newAvatarUrl,
        },
      });

      if (error) {
        throw error;
      }

      setUser(updatedUser.user);
      setAvatarUrl(newAvatarUrl);
      setSelectedFile(null);

      setMessage("Profile updated successfully.");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Failed to update profile.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const blockchainIdentity = (
    <section className="profile-section">
      <h2>Blockchain identity</h2>
      <p>
        Wallet signatures authenticate you. Ownership and licenses come from
        ModelChain, not your profile.
      </p>
      <dl className="provenance-fields">
        <div>
          <dt>Linked wallet</dt>
          <dd>
            <CopyValue value={identity.linked} label="linked wallet" />
          </dd>
        </div>
        <div>
          <dt>MetaMask connection</dt>
          <dd>
            <CopyValue value={identity.connected} label="connected wallet" />
          </dd>
        </div>
        <div>
          <dt>Wallet authentication</dt>
          <dd>
            {identity.authenticated ? "Authenticated" : "Not authenticated"}
          </dd>
        </div>
        <div>
          <dt>Required network</dt>
          <dd>
            <NetworkBadge />
          </dd>
        </div>
        <div>
          <dt>Connected chain</dt>
          <dd>{identity.chain || "Not connected"}</dd>
        </div>
      </dl>
      <WalletGate action="authenticate your blockchain identity" />
      {identity.profile && identity.authenticated && !identity.linked && (
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await linkProfileWallet();
              setMessage(
                "Public wallet address linked to profile. This grants no blockchain rights.",
              );
            } catch (e) {
              setMessage(errorText(e));
            } finally {
              setSaving(false);
            }
          }}
        >
          Link authenticated wallet
        </button>
      )}
      <button
        onClick={async () => {
          try {
            await logout();
            navigate("/login");
          } catch (e) {
            setMessage(errorText(e));
          }
        }}
      >
        Logout
      </button>
    </section>
  );
  if (!user)
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Profile & wallet</h1>
          <p>
            No optional human profile signed in. Wallet authentication works
            independently.
          </p>
          {blockchainIdentity}
          <button onClick={() => navigate("/login")}>
            Optional profile sign-in
          </button>
          {message && <p role="status">{message}</p>}
        </section>
      </main>
    );

  const createdDate = new Date(user.created_at).toLocaleDateString();

  const displayAvatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fullName || user.email,
    )}&background=1966d2&color=fff`;

  return (
    <div className="profile-page">
      <div className="profile-card">
        {/* HEADER */}
        <div className="profile-header">
          <div className="profile-avatar-wrapper">
            <img
              src={displayAvatar}
              alt="Profile"
              className="profile-avatar-image"
            />

            <label htmlFor="profile-picture" className="avatar-upload-button">
              📷
            </label>

            <input
              id="profile-picture"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />
          </div>

          <div>
            <h1>My Profile</h1>

            <p>
              Optional account profile — independent of your blockchain assets
            </p>
          </div>
        </div>

        {blockchainIdentity}

        {/* FULL NAME */}
        <div className="profile-section">
          <label htmlFor="profile-name">Full Name</label>

          <input
            id="profile-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        {/* EMAIL */}
        <div className="profile-section">
          <label>Email</label>

          <div className="profile-value">{user.email}</div>
        </div>

        {/* USER ID */}
        <div className="profile-section">
          <label>User ID</label>

          <div className="profile-value user-id">{user.id}</div>
        </div>

        {/* ACCOUNT CREATED */}
        <div className="profile-section">
          <label>Account created</label>

          <div className="profile-value">{createdDate}</div>
        </div>

        {/* MESSAGE */}
        {message && <div className="profile-message">{message}</div>}

        {/* ACTIONS */}
        <button
          onClick={async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(
              user.email,
              { redirectTo: window.location.origin + "/login" },
            );
            setMessage(
              error
                ? error.message
                : "Password reset link sent to your profile email.",
            );
          }}
        >
          Reset password
        </button>
        <div className="profile-actions">
          <button
            className="profile-save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

          <button className="profile-back-button" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
