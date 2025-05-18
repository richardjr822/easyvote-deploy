import React from "react";
import AdminSidebar from "../../components/AdminSidebar";
import AdminDashboard from "../../components/admindashboard"; // Import the AdminDashboard component

const AdminPage = () => {
  return (
    <div className="d-flex flex-column" style={{ minHeight: "100vh" }}> 
      {/* Sidebar and Main Content */}
      <div className="d-flex flex-grow-1">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <div>
          <AdminDashboard /> {/* Display the AdminDashboard component here */}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
