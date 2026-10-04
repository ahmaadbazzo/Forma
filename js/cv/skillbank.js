/* Offline skill dictionary: powers keyword extraction (Job Matcher) and the
 * "Suggest skills" action of the offline AI assistant. Easy to extend: add a group. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});

  const GROUPS = [
    { id: 'frontend', triggers: ['frontend', 'front-end', 'front end', 'web developer', 'ui developer', 'react', 'angular', 'vue'], skills: ['JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'HTML', 'CSS', 'Sass', 'Tailwind CSS', 'Redux', 'Next.js', 'Webpack', 'Vite', 'Responsive Design', 'Accessibility', 'Jest', 'REST APIs', 'GraphQL', 'Git', 'Web Performance'] },
    { id: 'backend', triggers: ['backend', 'back-end', 'back end', 'software engineer', 'software developer', 'api', 'server'], skills: ['Node.js', 'Python', 'Java', 'C#', '.NET', 'Go', 'PHP', 'Laravel', 'Django', 'Spring Boot', 'Express', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'REST APIs', 'GraphQL', 'Microservices', 'Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Azure', 'Git', 'Unit Testing', 'System Design'] },
    { id: 'mobile', triggers: ['mobile', 'android', 'ios', 'flutter', 'react native', 'swift', 'kotlin'], skills: ['Swift', 'Kotlin', 'Flutter', 'Dart', 'React Native', 'SwiftUI', 'Jetpack Compose', 'Firebase', 'REST APIs', 'App Store Deployment', 'Git', 'Unit Testing'] },
    { id: 'data', triggers: ['data scientist', 'data analyst', 'analytics', 'machine learning', 'data engineer', 'bi analyst', 'statistician'], skills: ['Python', 'R', 'SQL', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning', 'Data Visualization', 'Tableau', 'Power BI', 'Excel', 'Statistics', 'A/B Testing', 'ETL', 'Apache Spark', 'Data Modeling', 'NLP'] },
    { id: 'devops', triggers: ['devops', 'sre', 'cloud engineer', 'infrastructure', 'platform engineer', 'sysadmin', 'system administrator'], skills: ['Linux', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'AWS', 'Azure', 'Google Cloud', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Prometheus', 'Grafana', 'Bash', 'Networking', 'Monitoring', 'Security'] },
    { id: 'design', triggers: ['designer', 'ux', 'ui', 'product design', 'graphic', 'visual design'], skills: ['Figma', 'UX Research', 'User Testing', 'Wireframing', 'Prototyping', 'Design Systems', 'Interaction Design', 'Usability Testing', 'Information Architecture', 'Adobe Photoshop', 'Adobe Illustrator', 'Typography', 'Accessibility', 'User Flows', 'Design Thinking', 'Branding'] },
    { id: 'marketing', triggers: ['marketing', 'seo', 'content', 'social media', 'brand', 'growth', 'copywriter'], skills: ['SEO', 'Content Strategy', 'Google Analytics', 'Social Media Marketing', 'Email Marketing', 'Copywriting', 'Paid Advertising', 'Google Ads', 'Facebook Ads', 'Brand Strategy', 'Market Research', 'CRM', 'HubSpot', 'Campaign Management', 'A/B Testing', 'Marketing Automation'] },
    { id: 'sales', triggers: ['sales', 'business development', 'account manager', 'customer success', 'account executive'], skills: ['Lead Generation', 'Negotiation', 'CRM', 'Salesforce', 'Account Management', 'Cold Outreach', 'Pipeline Management', 'Closing', 'Customer Relationship Management', 'Forecasting', 'Presentation Skills', 'Client Retention'] },
    { id: 'finance', triggers: ['accountant', 'accounting', 'finance', 'financial', 'auditor', 'bookkeeper', 'controller'], skills: ['Financial Reporting', 'Budgeting', 'Forecasting', 'Excel', 'QuickBooks', 'SAP', 'IFRS', 'GAAP', 'Auditing', 'Taxation', 'Accounts Payable', 'Accounts Receivable', 'Financial Analysis', 'Reconciliation', 'Variance Analysis'] },
    { id: 'pm', triggers: ['project manager', 'product manager', 'program manager', 'scrum', 'agile', 'product owner'], skills: ['Project Management', 'Agile', 'Scrum', 'Kanban', 'Roadmapping', 'Stakeholder Management', 'Risk Management', 'JIRA', 'Confluence', 'Budget Management', 'Product Strategy', 'User Stories', 'OKRs', 'Cross-functional Leadership'] },
    { id: 'hr', triggers: ['human resources', 'hr ', 'recruiter', 'talent', 'recruitment'], skills: ['Recruitment', 'Talent Acquisition', 'Onboarding', 'Employee Relations', 'Performance Management', 'HRIS', 'Payroll', 'Interviewing', 'Labor Law', 'Training & Development', 'Compensation & Benefits'] },
    { id: 'health', triggers: ['nurse', 'nursing', 'doctor', 'physician', 'clinical', 'pharmacist', 'healthcare', 'medical'], skills: ['Patient Care', 'Clinical Assessment', 'Electronic Health Records', 'Infection Control', 'CPR/BLS', 'Medication Administration', 'Patient Education', 'Triage', 'HIPAA', 'Medical Documentation'] },
    { id: 'edu', triggers: ['teacher', 'lecturer', 'professor', 'tutor', 'instructor', 'education'], skills: ['Curriculum Development', 'Lesson Planning', 'Classroom Management', 'Assessment', 'Differentiated Instruction', 'Educational Technology', 'Mentoring', 'Public Speaking', 'Research', 'Academic Writing'] },
    { id: 'engineering', triggers: ['mechanical', 'civil', 'electrical', 'engineer ', 'construction', 'architect'], skills: ['AutoCAD', 'SolidWorks', 'MATLAB', 'Project Planning', 'Quality Control', 'Technical Drawing', 'Safety Compliance', 'Revit', 'Estimating', 'Site Supervision'] },
    { id: 'support', triggers: ['customer service', 'support', 'help desk', 'call center', 'service desk'], skills: ['Customer Service', 'Ticketing Systems', 'Zendesk', 'Conflict Resolution', 'Active Listening', 'Technical Support', 'Troubleshooting', 'Knowledge Base', 'Live Chat'] },
    { id: 'soft', triggers: [], skills: ['Communication', 'Teamwork', 'Leadership', 'Problem Solving', 'Time Management', 'Critical Thinking', 'Adaptability', 'Collaboration', 'Attention to Detail', 'Presentation Skills', 'Negotiation', 'Mentoring', 'Strategic Planning', 'Analytical Skills', 'Creativity'] }
  ];

  const flat = Array.from(new Set(GROUPS.flatMap(g => g.skills)));
  const lower = new Map(flat.map(s => [s.toLowerCase(), s]));
  const ALIASES = { 'js': 'JavaScript', 'ts': 'TypeScript', 'reactjs': 'React', 'react.js': 'React', 'nodejs': 'Node.js', 'node': 'Node.js', 'vuejs': 'Vue.js', 'golang': 'Go', 'k8s': 'Kubernetes', 'postgres': 'PostgreSQL', 'ml': 'Machine Learning', 'ai': 'Artificial Intelligence', 'ux': 'UX Research', 'powerbi': 'Power BI', 'gcp': 'Google Cloud' };

  /** Suggest skills for a CV (title + existing text), excluding ones already listed. */
  function suggest(title, haveNames, extraText, limit = 12) {
    const hay = (String(title || '') + ' ' + String(extraText || '')).toLowerCase();
    const have = new Set((haveNames || []).map(s => s.toLowerCase()));
    const scored = [];
    GROUPS.forEach(g => {
      let hits = 0;
      g.triggers.forEach(t => { if (hay.includes(t)) hits += (String(title || '').toLowerCase().includes(t) ? 3 : 1); });
      if (hits) scored.push([g, hits]);
    });
    scored.sort((a, b) => b[1] - a[1]);
    const out = [];
    const push = s => { if (!have.has(s.toLowerCase()) && !out.includes(s)) out.push(s); };
    scored.slice(0, 3).forEach(([g]) => g.skills.forEach(push));
    if (out.length < limit) GROUPS.find(g => g.id === 'soft').skills.forEach(push);
    return out.slice(0, limit);
  }

  CVM.SkillBank = { GROUPS, flat, lower, ALIASES, suggest };
})();
