import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PolicySimulator from './pages/PolicySimulator';
import IncidentSimulator from './pages/IncidentSimulator';
import LabelLab from './pages/LabelLab';
import SITBuilder from './pages/SITBuilder';
import FalsePositiveLab from './pages/FalsePositiveLab';
import InsiderRisk from './pages/InsiderRisk';
import ComplianceLab from './pages/ComplianceLab';
import EndToEndSimulation from './pages/EndToEnd/EndToEndSimulation';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/policy-simulator" element={<PolicySimulator />} />
        <Route path="/incident-simulator" element={<IncidentSimulator />} />
        <Route path="/label-lab" element={<LabelLab />} />
        <Route path="/sit-builder" element={<SITBuilder />} />
        <Route path="/false-positive-lab" element={<FalsePositiveLab />} />
        <Route path="/insider-risk" element={<InsiderRisk />} />
        <Route path="/compliance-lab" element={<ComplianceLab />} />
        <Route path="/end-to-end" element={<EndToEndSimulation />} />
      </Route>
    </Routes>
  );
}
