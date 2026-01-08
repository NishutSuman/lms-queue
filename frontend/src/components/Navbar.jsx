import React from "react";
import { Button } from "antd";

const Navbar = ({ onOpenConfigModal }) => {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-white shadow-sm">
      <div className="text-2xl font-semibold text-gray-800">Automation</div>

      <div className="flex items-center gap-4">
        <Button
        type="primary"
        variant="dashed"
        href="https://docs.google.com/spreadsheets/d/19jut7sjUkAaUshglvwZIr1NigBUFccLmXI6JSgtJVVo/edit?gid=0#gid=0"
        target="blank"
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