export interface Report {
  id: string;
  image_url: string;
  ward: string;
  locality: string;
  issue_type: string; // Pothole, Water Leakage, Broken Streetlight, Garbage Accumulation, etc.
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number; // e.g. 0.92
  priority: "Low" | "Medium" | "High" | "Critical";
  authority: string; // Municipal authority name
  complaint_draft: string;
  action_plan: string;
  created_at: string; // ISO timestamp
  status: "Investigating" | "Officer Assigned" | "Engineer Assigned" | "Inspection Scheduled" | "Repair Started" | "Repair Completed" | "Resolved" | "Archived";
  latitude?: number;
  longitude?: number;
  formatted_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  follow_up_answers?: { question: string; answer: string }[];
  explainability?: {
    visual_evidence: string;
    severity_reasoning: string;
    authority_reasoning: string;
    recommended_action_reasoning: string;
  };
  estimation?: {
    repair_cost: number;
    required_materials: string[];
    required_workers: number;
    estimated_duration: string;
    complexity: "Low" | "Medium" | "High";
  };
  assigned_engineer?: string;
  assigned_department?: string;
  deadline?: string;
  internal_notes?: string;
  supporter_count?: number;
}

export interface WardStats {
  ward_id: string;
  ward_name: string;
  road_score: number;       // 0-100 score, higher is better
  water_score: number;      // 0-100 score
  lighting_score: number;   // 0-100 score
  waste_score: number;      // 0-100 score
  overall_score: number;    // average or weighted score
  report_count: number;
}

export interface AnalyzeImageRequest {
  image: string; // base64 encoded image or image url
  description: string;
}

export interface AnalyzeImageResponse {
  issue_type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  follow_up_questions: string[];
  issue_summary: string;
  estimated_public_impact: string;
  recommended_authority: string;
  explainability?: {
    visual_evidence: string;
    severity_reasoning: string;
    authority_reasoning: string;
    recommended_action_reasoning: string;
  };
}

export interface GenerateReportRequest {
  image_url: string;
  ward: string;
  locality: string;
  issue_type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  follow_up_answers: { question: string; answer: string }[];
  latitude?: number;
  longitude?: number;
  formatted_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  explainability?: {
    visual_evidence: string;
    severity_reasoning: string;
    authority_reasoning: string;
    recommended_action_reasoning: string;
  };
}

export interface GenerateReportResponse {
  id: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  authority: string;
  action_plan: string;
  complaint_draft: string;
  estimation?: {
    repair_cost: number;
    required_materials: string[];
    required_workers: number;
    estimated_duration: string;
    complexity: "Low" | "Medium" | "High";
  };
}

