import React from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";

const Navbar = ({ onOpenConfigModal }) => {
  const navigate = useNavigate();
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-white shadow-sm">
      <div
        className="text-2xl font-semibold text-gray-800 cursor-pointer"
        onClick={() => navigate("/")}
      >
        Automation
      </div>

      <div className="flex items-center gap-4">
        <Button type="primary" ghost onClick={() => navigate("/auto")}>
          ⚡ Auto Mode
        </Button>
        <Button
        type="primary"
        variant="dashed"
        href="https://docs.google.com/spreadsheets/d/1aTRqMYzgjJJ8WOe3vN6vD_jWlNkC4VO4DmVcdu69Rf8/edit"
        target="_blank"
        >
          Example CSV
        </Button>
        <Button
          type="default"
          className="rounded-md bg-green-600 text-white"
          onClick={onOpenConfigModal}
        >
          Add Configuration
        </Button>

        <Button type="primary" className="rounded-md">
          Login
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;