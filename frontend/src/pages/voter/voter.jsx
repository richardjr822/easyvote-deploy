import React from "react";
import VoterDashboard from "../../components/voter/voterdashboard"; 
import VoterHeader from "../../components/voter/voterheader";

const Voter = () => {
  return (
    <div className="d-flex flex-column" style={{ minHeight: "100vh" }}> 
      {/* Sidebar and Main Content */}
      <div className="d-flex flex-grow-1">

        {/* Main Content */}
        <div className="flex-grow-1">
          <VoterHeader />
          <VoterDashboard />
        </div>
      </div>
    </div>
  );
};

export default Voter;
