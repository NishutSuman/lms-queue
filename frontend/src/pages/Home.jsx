import { useNavigate } from "react-router-dom";
import { Card, Button, Row, Col, Typography } from "antd";
import { motion } from "framer-motion";

export default function Home() {
  const navigate = useNavigate();
  const { Title, Paragraph } = Typography;

  const features = [
  "Clone assessments & create assignments automatically",
  "Auto-update notes & generate lectures automatically",
  "Check the example CSV using the 'Example CSV' button in the Navbar",
  "Add configurations easily using the 'Add Configuration' button in the Navbar",
  "Super-fast automation that saves your time",
  ];
  
  return (
    <div className="max-w-5xl mx-auto">
      <Card
        style={{
          borderRadius: 20,
          padding: 30,
          boxShadow: "0px 8px 25px rgba(0, 0, 0, 0.08)",
          background: "#ffffffcc",
          backdropFilter: "blur(6px)",
        }}
      >
        <Title level={2} className="mb-3">
          Automation Dashboard
        </Title>

        <Paragraph className="text-gray-600 mb-8 text-lg">
          Automate assessments, assignments, notes updates & lecture creation
          in just one click. Select your workflow and get started instantly.
        </Paragraph>

        {/* 🔥 ANIMATED POINTS LIST */}
        <div className="mb-10">
          {features.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.3, // each line after 0.3 sec
              }}
              className="text-lg mb-2 flex items-start gap-2"
            >
              <span className="text-blue-500 mt-1">✔</span>
              <span>{item}</span>
            </motion.div>
          ))}
        </div>

        <Row gutter={[24, 24]}>
          {/* Assignments Card */}
          <Col xs={24} md={12}>
            <Card
              hoverable
              style={{
                borderRadius: 15,
                boxShadow: "0px 6px 18px rgba(0,0,0,0.06)",
                transition: "all 0.3s ease",
              }}
              bodyStyle={{ padding: 25 }}
              onClick={() => navigate("/dashboard?type=assignments")}
            >
              <Title level={4}>Assignments Automation</Title>
              <Paragraph type="secondary">
                Clone assessments, create assignments, and update notes
                automatically with a single workflow.
              </Paragraph>

              <Button
                type="primary"
                style={{
                  marginTop: 15,
                  padding: "0 25px",
                  height: 40,
                  borderRadius: 8,
                  background: "#1677ff",
                }}
              >
                Get Started
              </Button>
            </Card>
          </Col>

          {/* Lectures Card */}
          <Col xs={24} md={12}>
            <Card
              hoverable
              style={{
                borderRadius: 15,
                boxShadow: "0px 6px 18px rgba(0,0,0,0.06)",
                transition: "all 0.3s ease",
              }}
              bodyStyle={{ padding: 25 }}
              onClick={() => navigate("/dashboard?type=lectures")}
            >
              <Title level={4}>Lectures Automation</Title>
              <Paragraph type="secondary">
                Automatically creates Lectures and Pre-Reads based on the "lecture" sheet in your CSV file.
              </Paragraph>

              <Button
                type="primary"
                style={{
                  marginTop: 15,
                  padding: "0 25px",
                  height: 40,
                  borderRadius: 8,
                  background: "#10b981",
                  borderColor: "#10b981",
                }}
              >
                Get Started
              </Button>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}









// import { useNavigate } from "react-router-dom";
// import { Card, Button, Row, Col, Typography } from "antd";

// export default function Home() {
//   const navigate = useNavigate();
//   const { Title, Paragraph } = Typography;

//   return (
//     // <div
//     //   className="min-h-[80vh] p-10 "
//     //   style={{
//     //     background: "linear-gradient(135deg, #eef2ff, #fdfcfb)",
//     //   }}
//     // >
//       <div className="max-w-5xl mx-auto">
//         <Card
//           style={{
//             borderRadius: 20,
//             padding: 30,
//             boxShadow: "0px 8px 25px rgba(0, 0, 0, 0.08)",
//             background: "#ffffffcc",
//             backdropFilter: "blur(6px)",
//           }}
//         >
//           <Title level={2} className="mb-3">
//             Automation Dashboard
//           </Title>

//           <Paragraph className="text-gray-600 mb-10 text-lg">
//             Automate assessments, assignments, notes updates & lecture creation
//             in just one click. Select your workflow and get started instantly.
//           </Paragraph>

//           <Row gutter={[24, 24]}>
//             {/* Assignments Card */}
//             <Col xs={24} md={12}>
//               <Card
//                 hoverable
//                 style={{
//                   borderRadius: 15,
//                   boxShadow: "0px 6px 18px rgba(0,0,0,0.06)",
//                   transition: "all 0.3s ease",
//                 }}
//                 bodyStyle={{ padding: 25 }}
//                 onClick={() => navigate("/dashboard?type=assignments")}
//               >
//                 <Title level={4}>Assignments Automation</Title>
//                 <Paragraph type="secondary">
//                   Clone assessments, create assignments, and update notes
//                   automatically with a single workflow.
//                 </Paragraph>

//                 <Button
//                   type="primary"
//                   style={{
//                     marginTop: 15,
//                     padding: "0 25px",
//                     height: 40,
//                     borderRadius: 8,
//                     background: "#1677ff",
//                   }}
//                 >
//                   Get Started
//                 </Button>
//               </Card>
//             </Col>

//             {/* Lectures Card */}
//             <Col xs={24} md={12}>
//               <Card
//                 hoverable
//                 style={{
//                   borderRadius: 15,
//                   boxShadow: "0px 6px 18px rgba(0,0,0,0.06)",
//                   transition: "all 0.3s ease",
//                 }}
//                 bodyStyle={{ padding: 25 }}
//                 onClick={() => navigate("/dashboard?type=lectures")}
//               >
//                 <Title level={4}>Lectures Automation</Title>
//                 <Paragraph type="secondary">
//                   Upload CSV or use templates to generate lectures effortlessly.
//                 </Paragraph>

//                 <Button
//                   type="primary"
//                   style={{
//                     marginTop: 15,
//                     padding: "0 25px",
//                     height: 40,
//                     borderRadius: 8,
//                     background: "#10b981",
//                     borderColor: "#10b981",
//                   }}
//                 >
//                   Get Started
//                 </Button>
//               </Card>
//             </Col>
//           </Row>
//         </Card>
//       </div>
//     // </div>
//   );
// }