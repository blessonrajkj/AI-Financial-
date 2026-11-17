import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Globe, 
  Clock, 
  ShieldCheck, 
  Camera, 
  Upload, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  
  // Profile state
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    occupation: '',
    annual_income: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pin_code: '',
    preferred_currency: '',
    preferred_language: '',
    time_zone: '',
  });

  const [formErrors, setFormErrors] = useState({});

  // Media states
  const [dragActive, setDragActive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [selectedImgUrl, setSelectedImgUrl] = useState('');
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });

  // Refs
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cropContainerRef = useRef(null);
  const isDraggingCrop = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Fetch Profile on Load
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/profile`);
      setProfile(res.data);
      resetForm(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load profile. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const resetForm = (data) => {
    if (!data) return;
    setFormData({
      full_name: data.full_name || '',
      phone_number: data.phone_number || '',
      date_of_birth: data.date_of_birth || '',
      gender: data.gender || '',
      occupation: data.occupation || '',
      annual_income: data.annual_income || 0,
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || '',
      pin_code: data.pin_code || '',
      preferred_currency: data.preferred_currency || 'INR',
      preferred_language: data.preferred_language || 'English',
      time_zone: data.time_zone || 'Asia/Kolkata',
    });
    setFormErrors({});
  };

  // Form Validations
  const validateForm = () => {
    const errors = {};
    
    // Name validation
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    // Phone validation
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (formData.phone_number && !phoneRegex.test(formData.phone_number)) {
      errors.phone_number = 'Invalid phone number (must be 10-15 digits)';
    }

    // DOB validation
    if (formData.date_of_birth) {
      const selectedDate = new Date(formData.date_of_birth);
      const today = new Date();
      if (selectedDate > today) {
        errors.date_of_birth = 'Date of birth cannot be in the future';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'annual_income' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fix validation errors', 'error');
      return;
    }

    try {
      const res = await axios.put(`${API_URL}/profile`, formData);
      setProfile(res.data);
      await refreshUser(); // Sync with context
      setIsEditing(false);
      showToast('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || 'Failed to update profile.', 'error');
    }
  };

  // File drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file) => {
    // Check format
    const validExtensions = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validExtensions.includes(file.type)) {
      showToast('Unsupported format. Please upload PNG, JPG, or WEBP.', 'error');
      return;
    }

    // Check size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('File is too large. Maximum size is 5MB.', 'error');
      return;
    }

    // Create URL
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImgUrl(reader.result);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
  };

  // Camera capture methods
  const startCamera = async () => {
    setShowCamera(true);
    try {
      setTimeout(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error(err);
      showToast('Unable to access camera.', 'error');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Draw square center snapshot
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg');
    stopCamera();
    setSelectedImgUrl(dataUrl);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setShowCrop(true);
  };

  // Crop Interaction
  const handleCropMouseDown = (e) => {
    isDraggingCrop.current = true;
    dragStart.current = {
      x: e.clientX - cropOffset.x,
      y: e.clientY - cropOffset.y
    };
  };

  const handleCropMouseMove = (e) => {
    if (!isDraggingCrop.current) return;
    setCropOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleCropMouseUp = () => {
    isDraggingCrop.current = false;
  };

  const executeCropAndUpload = async () => {
    // We render the cropped area into a canvas
    const img = new Image();
    img.src = selectedImgUrl;
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      const size = 300; // Output avatar resolution
      canvas.width = size;
      canvas.height = size;

      // Draw the circle cropped image onto canvas
      ctx.clearRect(0, 0, size, size);
      
      // Calculate crop metrics based on zoom and offset
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      const aspect = imgWidth / imgHeight;

      let drawWidth = size * cropZoom;
      let drawHeight = size * cropZoom;

      if (aspect > 1) {
        drawWidth = size * aspect * cropZoom;
      } else {
        drawHeight = (size / aspect) * cropZoom;
      }

      const dx = (size - drawWidth) / 2 + cropOffset.x;
      const dy = (size - drawHeight) / 2 + cropOffset.y;

      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

      // Convert to blob and upload
      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'avatar.jpg');

        try {
          const res = await axios.post(`${API_URL}/profile/avatar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (res.data.status === 'success') {
            await refreshUser();
            setProfile(prev => ({ ...prev, avatar_url: res.data.avatar_url }));
            setShowCrop(false);
            showToast('Profile photo updated successfully!');
          }
        } catch (err) {
          console.error(err);
          showToast('Failed to upload image.', 'error');
        }
      }, 'image/jpeg', 0.9);
    };
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    try {
      await axios.delete(`${API_URL}/profile/avatar`);
      await refreshUser();
      setProfile(prev => ({ ...prev, avatar_url: null }));
      showToast('Profile photo removed.');
    } catch (err) {
      console.error(err);
      showToast('Failed to remove profile photo.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 bg-borderColor/40 w-1/4 rounded-xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-borderColor/20 rounded-3xl"></div>
          <div className="h-80 bg-borderColor/20 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-danger/10 border border-danger/20 rounded-3xl text-danger text-center font-bold">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed top-24 right-6 z-50 flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-lg border transition-all duration-300 transform translate-y-0 ${
          toast.type === 'error' 
            ? 'bg-danger/10 border-danger/20 text-danger' 
            : 'bg-success/10 border-success/20 text-success'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">My Profile</h1>
          <p className="text-textSecondary mt-1">Manage your fintech identity and preferred account details</p>
        </div>
        <div>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto px-6 h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-primary/20 hover:shadow-lg transition-all"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => { resetForm(profile); setIsEditing(false); }}
                className="flex-1 sm:flex-initial px-3 sm:px-5 h-11 bg-hoverBg hover:bg-borderColor text-textPrimary text-xs sm:text-sm font-bold rounded-xl border border-borderColor transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => resetForm(profile)}
                className="flex-1 sm:flex-initial px-3 sm:px-5 h-11 bg-background hover:bg-hoverBg text-textSecondary text-xs sm:text-sm font-bold rounded-xl border border-borderColor transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={handleSaveProfile}
                className="w-full sm:w-auto px-5 sm:px-6 h-11 bg-success hover:bg-success/90 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-success/20 hover:shadow-lg transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Visual Profile Info (Details & Photo Area) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Glass Card: Avatar & Header Profile Banner */}
          <div 
            className={`glass-panel p-6 relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-6 transition-all ${
              dragActive ? 'border-primary border-2 bg-primary/5' : ''
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {/* Background Blur Sparkle */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Avatar Photo Frame */}
            <div className="relative group w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-borderColor bg-background shadow-soft flex-shrink-0">
              <img 
                src={profile?.avatar_url ? `${profile.avatar_url}` : `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.email}`}
                alt="Profile Avatar"
                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
              />
              
              {/* Overlay Trigger for Change Photo */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                <Camera className="w-6 h-6 mb-1 text-white" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Change Photo</span>
                
                <input 
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Photo Action buttons */}
            <div className="flex-1 text-center md:text-left space-y-3 relative z-10 self-center">
              <h3 className="text-xl font-bold text-textPrimary leading-tight">
                {profile?.full_name || 'PariView User'}
              </h3>
              <p className="text-xs text-textSecondary font-semibold">
                @{profile?.username || 'user'} • {profile?.email}
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
                <button 
                  onClick={startCamera}
                  className="px-3.5 py-2 bg-hoverBg hover:bg-borderColor text-textPrimary text-xs font-bold rounded-xl flex items-center space-x-1.5 border border-borderColor transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Use Camera</span>
                </button>
                {profile?.avatar_url && (
                  <button 
                    onClick={handleRemovePhoto}
                    className="px-3.5 py-2 bg-danger/10 hover:bg-danger/20 text-danger text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-textMuted pt-1">
                Drag and drop your file here. Supports PNG, JPG or WEBP (Max 5MB)
              </p>
            </div>
          </div>

          {/* Glass Card: Detailed Profile Form */}
          <div className="glass-panel p-6 space-y-6">
            <h3 className="text-lg font-bold text-textPrimary border-b border-borderColor pb-3">
              Personal Credentials & Identification
            </h3>

            {!isEditing ? (
              // VIEW MODE
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Full Name</span>
                  <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary">
                    <UserIcon className="w-4 h-4 text-textSecondary" />
                    <span>{profile?.full_name || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Username</span>
                  <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary">
                    <span className="text-textSecondary">@</span>
                    <span>{profile?.username || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Phone Number</span>
                  <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary">
                    <Phone className="w-4 h-4 text-textSecondary" />
                    <span>{profile?.phone_number || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Date of Birth</span>
                  <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary">
                    <Calendar className="w-4 h-4 text-textSecondary" />
                    <span>{profile?.date_of_birth || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Gender</span>
                  <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary">
                    <UserIcon className="w-4 h-4 text-textSecondary" />
                    <span className="capitalize">{profile?.gender || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Occupation</span>
                  <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary">
                    <Briefcase className="w-4 h-4 text-textSecondary" />
                    <span>{profile?.occupation || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Annual Income</span>
                  <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary">
                    <DollarSign className="w-4 h-4 text-textSecondary" />
                    <span>{profile?.annual_income ? `${profile.preferred_currency || 'INR'} ${profile.annual_income.toLocaleString()}` : 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Address</span>
                  <div className="flex items-start space-x-2 text-sm font-semibold text-textPrimary">
                    <MapPin className="w-4 h-4 text-textSecondary mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{profile?.address || 'Not provided'}</p>
                      {(profile?.city || profile?.state || profile?.country) && (
                        <p className="text-xs text-textSecondary mt-0.5">
                          {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                          {profile.pin_code && ` - ${profile.pin_code}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Preferred Currency</span>
                  <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary">
                    <DollarSign className="w-4 h-4 text-textSecondary" />
                    <span>{profile?.preferred_currency || 'INR'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Preferred Language</span>
                  <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary">
                    <Globe className="w-4 h-4 text-textSecondary" />
                    <span>{profile?.preferred_language || 'English'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider block">Time Zone</span>
                  <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary">
                    <Clock className="w-4 h-4 text-textSecondary" />
                    <span>{profile?.time_zone || 'Asia/Kolkata'}</span>
                  </div>
                </div>
              </div>
            ) : (
              // EDIT MODE FORM
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Full Name *</label>
                    <input 
                      type="text" 
                      name="full_name"
                      required
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className={`w-full h-11 px-4 bg-background border ${formErrors.full_name ? 'border-danger' : 'border-borderColor'} rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all`}
                    />
                    {formErrors.full_name && <span className="text-[10px] text-danger font-semibold mt-1 block">{formErrors.full_name}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Username</label>
                    <input 
                      type="text" 
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="e.g. john_doe"
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Phone Number</label>
                    <input 
                      type="tel" 
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="+919876543210"
                      className={`w-full h-11 px-4 bg-background border ${formErrors.phone_number ? 'border-danger' : 'border-borderColor'} rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all`}
                    />
                    {formErrors.phone_number && <span className="text-[10px] text-danger font-semibold mt-1 block">{formErrors.phone_number}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Date of Birth</label>
                    <input 
                      type="date" 
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className={`w-full h-11 px-4 bg-background border ${formErrors.date_of_birth ? 'border-danger' : 'border-borderColor'} rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all`}
                    />
                    {formErrors.date_of_birth && <span className="text-[10px] text-danger font-semibold mt-1 block">{formErrors.date_of_birth}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Gender</label>
                    <select 
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Occupation</label>
                    <input 
                      type="text" 
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleInputChange}
                      placeholder="e.g. Software Engineer"
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Annual Income</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-textMuted absolute left-4 top-3.5" />
                      <input 
                        type="number" 
                        name="annual_income"
                        value={formData.annual_income}
                        onChange={handleInputChange}
                        placeholder="e.g. 800000"
                        className="w-full h-11 pl-10 pr-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Preferred Currency</label>
                    <select 
                      name="preferred_currency"
                      value={formData.preferred_currency}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (Dh)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Street Address</label>
                    <input 
                      type="text" 
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Street address, building, floor"
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">City</label>
                    <input 
                      type="text" 
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. Mumbai"
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">State</label>
                    <input 
                      type="text" 
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="e.g. Maharashtra"
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Country</label>
                    <input 
                      type="text" 
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="e.g. India"
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">PIN / ZIP Code</label>
                    <input 
                      type="text" 
                      name="pin_code"
                      value={formData.pin_code}
                      onChange={handleInputChange}
                      placeholder="e.g. 400001"
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Preferred Language</label>
                    <select 
                      name="preferred_language"
                      value={formData.preferred_language}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Time Zone</label>
                    <select 
                      name="time_zone"
                      value={formData.time_zone}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="Asia/Kolkata">India (Asia/Kolkata)</option>
                      <option value="America/New_York">US Eastern (America/New_York)</option>
                      <option value="Europe/London">London (Europe/London)</option>
                      <option value="Asia/Dubai">Dubai (Asia/Dubai)</option>
                      <option value="Asia/Singapore">Singapore (Asia/Singapore)</option>
                    </select>
                  </div>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Account Verification / Administrative Metadata */}
        <div className="space-y-6">
          
          <div className="glass-panel p-6 space-y-6">
            <h3 className="text-lg font-bold text-textPrimary border-b border-borderColor pb-3">
              Account Metadata
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-borderColor/50">
                <span className="text-xs font-bold text-textSecondary uppercase tracking-wider">Verification Status</span>
                <div className="flex items-center space-x-1">
                  <ShieldCheck className={`w-4 h-4 ${profile?.is_verified ? 'text-success' : 'text-warning'}`} />
                  <span className={`text-xs font-bold ${profile?.is_verified ? 'text-success' : 'text-warning'}`}>
                    {profile?.is_verified ? 'Verified Active' : 'Pending Verification'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-borderColor/50">
                <span className="text-xs font-bold text-textSecondary uppercase tracking-wider">Account Type</span>
                <span className="text-xs font-extrabold uppercase tracking-wide px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">
                  {profile?.role || 'User'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-borderColor/50">
                <span className="text-xs font-bold text-textSecondary uppercase tracking-wider">Member Since</span>
                <span className="text-xs font-semibold text-textPrimary">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'July 2026'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-borderColor/50">
                <span className="text-xs font-bold text-textSecondary uppercase tracking-wider">Last Login</span>
                <span className="text-xs font-semibold text-textPrimary">
                  {new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-bold text-textSecondary uppercase tracking-wider font-mono">User ID</span>
                <span className="text-xs font-bold text-textMuted font-mono">
                  USR-{profile?.user_id || '00000'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* CAMERA CAPTURE MODAL */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button 
              onClick={stopCamera}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-hoverBg text-textSecondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-bold text-textPrimary text-center">Capture Snapshot</h4>
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-borderColor bg-black">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
            </div>
            <button 
              onClick={captureSnapshot}
              className="w-full h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-primary/25 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* CANVAS IMAGE CROP MODAL */}
      {showCrop && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <button 
              onClick={() => setShowCrop(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-hoverBg text-textSecondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h4 className="text-lg font-bold text-textPrimary text-center">Crop Profile Image</h4>
            
            {/* Cropper Box */}
            <div 
              ref={cropContainerRef}
              onMouseMove={handleCropMouseMove}
              onMouseUp={handleCropMouseUp}
              onMouseLeave={handleCropMouseUp}
              className="relative aspect-square w-full rounded-2xl overflow-hidden border border-borderColor bg-background cursor-move select-none"
            >
              <div 
                onMouseDown={handleCropMouseDown}
                style={{
                  transform: `scale(${cropZoom}) translate(${cropOffset.x}px, ${cropOffset.y}px)`,
                  transition: isDraggingCrop.current ? 'none' : 'transform 0.1s ease-out'
                }}
                className="w-full h-full flex items-center justify-center absolute inset-0"
              >
                <img 
                  src={selectedImgUrl} 
                  alt="Crop Target"
                  className="max-w-full max-h-full object-contain pointer-events-none"
                />
              </div>

              {/* Circular Overlay Mask */}
              <div className="absolute inset-0 pointer-events-none border-[30px] border-black/50 flex items-center justify-center">
                <div className="w-full h-full rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"></div>
              </div>
            </div>

            {/* Slider zoom */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-textSecondary">
                <span>Zoom Scale</span>
                <span>{Math.round(cropZoom * 100)}%</span>
              </div>
              <input 
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-borderColor rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button 
                onClick={() => setShowCrop(false)}
                className="w-1/2 h-11 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeCropAndUpload}
                className="w-1/2 h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-primary/20 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Save Photo</span>
              </button>
            </div>
            
            {/* Hidden workspace canvas */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
