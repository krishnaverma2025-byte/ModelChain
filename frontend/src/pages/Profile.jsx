import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Profile.css";

function Profile() {
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
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        navigate("/login");
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
      const { data: updatedUser, error } =
        await supabase.auth.updateUser({
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

  if (!user) return null;

  const createdDate = new Date(
    user.created_at
  ).toLocaleDateString();

  const displayAvatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fullName || user.email
    )}&background=6d3df5&color=fff`;

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

            <label
              htmlFor="profile-picture"
              className="avatar-upload-button"
            >
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
              Manage your MontAI account
            </p>
          </div>

        </div>


        {/* FULL NAME */}
        <div className="profile-section">

          <label>Full Name</label>

          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />

        </div>


        {/* EMAIL */}
        <div className="profile-section">

          <label>Email</label>

          <div className="profile-value">
            {user.email}
          </div>

        </div>


        {/* USER ID */}
        <div className="profile-section">

          <label>User ID</label>

          <div className="profile-value user-id">
            {user.id}
          </div>

        </div>


        {/* ACCOUNT CREATED */}
        <div className="profile-section">

          <label>Account created</label>

          <div className="profile-value">
            {createdDate}
          </div>

        </div>


        {/* MESSAGE */}
        {message && (
          <div className="profile-message">
            {message}
          </div>
        )}


        {/* ACTIONS */}
        <div className="profile-actions">

          <button
            className="profile-save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

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