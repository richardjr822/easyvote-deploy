// src/services/api.js
// Normalize API_URL to ensure it doesn't end with a slash
const API_URL = import.meta.env.VITE_API_BASE_URL.endsWith('/') 
  ? import.meta.env.VITE_API_BASE_URL.slice(0, -1) 
  : import.meta.env.VITE_API_BASE_URL;

// For requests that don't need authentication
export async function fetchData(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.detail || 'Something went wrong');
  }
  
  return data;
}

// Generic fetch function for authenticated requests
export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    } catch (e) {
      throw new Error('Request failed: ' + response.status);
    }
  }
  
  return response.json();
};

// Login function
export const login = async (credentials, role) => {
  console.log("Login attempt:", credentials, role);

  const userType = role === "Admin" ? "admin" : "student";
  
  // Prepare the request body based on user type
  const body = {
    password: credentials.password,
    user_type: userType
  };
  
  if (userType === "admin") {
    body.username = credentials.studentId; // For admins, using studentId as username
  } else {
    body.student_no = credentials.studentId; // For students, using studentId as student_no
  }
  
  console.log("Request body:", body);
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Parse the response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      throw new Error("Invalid server response");
    }
    
    // Check if the request was successful
    if (!response.ok) {
      console.error("Login failed:", data);
      throw new Error(data.detail || "Login failed");
    }
    
    // Store auth data in localStorage
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user_type', data.user_type);
    localStorage.setItem('user_id', data.user_id);
    localStorage.setItem('full_name', data.full_name);
    
    // Store identity info based on user type
    if (data.user_type === 'student') {
      localStorage.setItem('student_no', data.student_no);
    } else {
      localStorage.setItem('username', data.username);
    }
    
    console.log("Login successful:", data);
    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Logout function
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user_type');
  localStorage.removeItem('user_id');
  localStorage.removeItem('full_name');
  localStorage.removeItem('student_no');
  localStorage.removeItem('username');
};

// Get current user info
export const getCurrentUser = () => {
  const userType = localStorage.getItem('user_type');
  
  if (!userType) {
    return null;
  }
  
  return {
    userId: localStorage.getItem('user_id'),
    userType: userType,
    fullName: localStorage.getItem('full_name'),
    studentNo: localStorage.getItem('student_no'), // Only for students
    username: localStorage.getItem('username'),    // Only for admins
  };
};