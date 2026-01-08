import React from "react";
import { Layout, Space, Typography } from "antd";
import { GithubOutlined, GlobalOutlined, LinkedinOutlined } from "@ant-design/icons";

const { Text } = Typography;

const Footer = () => {
  return (
    <div className="text-center flex items-center justify-center bg-white shadow-sm mt-10 p-2 gap-2">
      {/* Signature */}
      <Text>
        Built with ❤️ by{" "}
        <span className="font-semibold text-gray-800">
          Mohd Murtaza
        </span>
      </Text>

      {/* Social Icons */}
      <div size="large" className="text-xl flex gap-2">
        <a
          href="https://github.com/mohd-murtaza"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GithubOutlined />
        </a>

        <a
          href="https://www.linkedin.com/in/mohd-murtaza-20a86027a/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <LinkedinOutlined />
        </a>
        <a
          href="https://mohd-murtaza.github.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GlobalOutlined />
        </a>
      </div>
    </div>
  );
};

export default Footer;
