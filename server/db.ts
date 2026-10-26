import fs from 'fs';
import path from 'path';
import bcryptjs from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
import {
  AdminUser,
  Student,
  Course,
  Enrollment,
  GradingConfiguration,
  CertificateTemplate,
  Certificate,
  InstituteSettings,
  AuditLog,
} from './types.js';

const { Pool } = pg;

// Ensure .env is loaded
dotenv.config();

interface DatabaseSchema {
  admins: AdminUser[];
  students: Student[];
  courses: Course[];
  enrollments: Enrollment[];
  gradingConfigs: GradingConfiguration[];
  templates: CertificateTemplate[];
  certificates: Certificate[];
  settings: InstituteSettings;
  auditLogs: AuditLog[];
}

export interface DatabaseStatus {
  mode: 'postgres';
  connected: boolean;
  databaseName?: string;
  host?: string;
  uriMasked?: string;
  error?: string | null;
  counts: {
    admins: number;
    students: number;
    courses: number;
    enrollments: number;
    certificates: number;
    auditLogs: number;
  };
}

const ENV_FILE = path.resolve(process.cwd(), '.env');

// ============================================================
// SEED DATA — only used as initial memory defaults.
// Postgres is the source of truth; this seed is NEVER pushed
// into an empty Postgres database (deleted records must stay deleted).
// ============================================================
async function generateInitialDatabase(): Promise<DatabaseSchema> {
  const passwordHash = bcryptjs.hashSync('admin123', 10);

  const defaultAdmin: AdminUser = {
    id: 'admin-1',
    email: 'admin@techforyou.edu',
    passwordHash,
    name: 'Administrator (Tech For You)',
    role: 'superadmin',
    createdAt: new Date().toISOString(),
  };

  const defaultSettings: InstituteSettings = {
    instituteName: 'Tech For You',
    tagline: 'Centre of Advanced Engineering, Software Development & Certified Computing',
    registrationNumber: 'TFY-REG-2021-0894',
    accreditationDetails: 'Centre of Advanced Software Engineering & Certified Computing',
    address: 'Kot Radha Kishan',
    phone: '03194331346',
    email: '',
    website: 'https://techforyou.edu.pk',
    instructorName: 'M.Moiz Raza',
    instructorTitle: 'Course Instructor',
    instructorSignatureUrl: 'M. Moiz Raza',
    directorName: '',
    directorTitle: '',
    directorSignatureUrl: '',
    registrarName: '',
    registrarTitle: '',
    registrarSignatureUrl: '',
    instituteSealUrl: '/logo.png',
    logoUrl: '/logo.png',
    certificateSerialPrefix: 'TFY-2026',
    certificateTitle: 'CERTIFICATE OF PROFESSIONAL COMPETENCE',
    certificateWording:
      'This is to certify that the candidate named herein has satisfactorily fulfilled all prescribed academic prerequisites, technical laboratory assignments, practical engineering modules, and comprehensive capstone project evaluations with commendable proficiency. This document is an Achievement Certificate awarded by Tech For You in recognition of skills and knowledge acquired through this program, and holds professional value as a record of achievement. It is NOT equivalent to any academic degree, diploma, or formal qualification, and does not confer any academic title, degree, or professional licensure. Tech For You is an independent professional training centre and is not a registered university, degree-awarding institution, or government-accredited educational body. This certificate is not issued under, nor is it equivalent to, any registered institute or regulated academic course of study, and carries no legal equivalence to a formal degree or diploma. It is issued solely as a professional achievement and skill-completion record.',
    verificationInstructions:
      'This certificate is an official cryptographic credential issued by Tech For You. Verify authenticity by scanning the official QR code or visiting https://techforyou.edu.pk/verify with the serial number.',
  };

  const gradingConfig: GradingConfiguration = {
    id: 'gc-default',
    title: 'Standard Institute Grading Scheme (2026)',
    method: 'total',
    passingPercentage: 50,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parameters: [
      { id: 'param-theory', name: 'Theory & Technical Foundations', maxMarks: 100, isRequired: true, description: 'Written & architectural conceptual assessment' },
      { id: 'param-practical', name: 'Hands-on Practical Labs & Coding', maxMarks: 100, isRequired: true, description: 'Lab tests, debugging challenges, and real-time coding' },
      { id: 'param-project', name: 'Comprehensive Capstone Project', maxMarks: 100, isRequired: true, description: 'Production-ready full deployment & GitHub review' },
      { id: 'param-viva', name: 'Technical Defense & Viva Voce', maxMarks: 50, isRequired: true, description: 'Oral panel questioning & architecture explanation' },
      { id: 'param-assignments', name: 'Continuous Assignments & Quizzes', maxMarks: 50, isRequired: false, description: 'Weekly milestones and task submissions' },
    ],
    rules: [
      { minPercentage: 90, grade: 'A+', resultLabel: 'Pass with High Distinction', isPassing: true, description: 'Outstanding performance across all theoretical & practical benchmarks' },
      { minPercentage: 80, grade: 'A', resultLabel: 'Pass with Distinction', isPassing: true, description: 'Excellent technical execution and conceptual command' },
      { minPercentage: 70, grade: 'B', resultLabel: 'Pass with Merit', isPassing: true, description: 'Very good understanding and consistent lab achievements' },
      { minPercentage: 60, grade: 'C', resultLabel: 'Pass (Satisfactory)', isPassing: true, description: 'Satisfactory completion meeting standard industry requirements' },
      { minPercentage: 50, grade: 'D', resultLabel: 'Pass', isPassing: true, description: 'Marginal pass meeting minimum prescribed thresholds' },
      { minPercentage: 0, grade: 'F', resultLabel: 'Fail', isPassing: false, description: 'Did not meet the prerequisite passing criteria' },
    ],
  };

  const templates: CertificateTemplate[] = [
    {
      id: 'tmpl-web-development',
      name: 'Professional Web Development (Floating Code Signs)',
      description: 'Specialized Web Development certificate theme featuring ambient floating coding tokens (</>, {}, async, git, React), cyber emerald borders, and Course Instructor accreditation.',
      themeStyle: 'web_development',
      primaryColor: '#040907',
      accentColor: '#10b981',
      secondaryColor: '#00ff87',
      borderStyle: 'cyber_circuit',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: true,
      isDefault: true,
    },
    {
      id: 'tmpl-cyber-emerald',
      name: 'Cyber Sentinel Obsidian & Emerald (Official)',
      description: 'Futuristic cybersecurity styling with neon emerald accents, obsidian dark borders, and circuit watermark.',
      themeStyle: 'cyber_emerald',
      primaryColor: '#0a0f0d',
      accentColor: '#10b981',
      secondaryColor: '#00ff66',
      borderStyle: 'cyber_circuit',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: true,
      isDefault: false,
    },
    {
      id: 'tmpl-imperial-gold',
      name: 'Imperial Royal Obsidian & Gold',
      description: 'Prestigious deep obsidian border with gold double-inlay accents, ceremonial seal, and crisp typography.',
      themeStyle: 'imperial_gold',
      primaryColor: '#0f1715',
      accentColor: '#10b981',
      secondaryColor: '#1e3a8a',
      borderStyle: 'ornate',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: false,
      isDefault: false,
    },
    {
      id: 'tmpl-modern-minimal',
      name: 'Modern Cyber Minimalist',
      description: 'Clean modern corporate styling with electric emerald highlights, high legibility, and architectural precision.',
      themeStyle: 'modern_minimal',
      primaryColor: '#060b09',
      accentColor: '#00ff66',
      secondaryColor: '#10b981',
      borderStyle: 'minimal',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: true,
      isDefault: false,
    },
    // ===== Professional AI-focused designs (6) =====
    {
      id: 'tmpl-ai-neural',
      name: 'AI Neural Intelligence (Deep Indigo)',
      description: 'Dark neural-network certificate with luminous indigo nodes, connecting synapses, monospace credential metadata and course-instructor accreditation.',
      themeStyle: 'ai_neural_network',
      primaryColor: '#0d1330',
      accentColor: '#8ab4ff',
      secondaryColor: '#a78bfa',
      borderStyle: 'cyber_circuit',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: false,
      isDefault: false,
    },
    {
      id: 'tmpl-ai-quantum',
      name: 'Quantum AI Aurora (Cyan & Violet)',
      description: 'Deep-space aurora gradients in cyan and violet for quantum computing and generative AI programs, with crisp monospace credential details.',
      themeStyle: 'ai_quantum_aurora',
      primaryColor: '#120a2e',
      accentColor: '#22d3ee',
      secondaryColor: '#c084fc',
      borderStyle: 'geometric',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: false,
      isDefault: false,
    },
    {
      id: 'tmpl-ai-terminal',
      name: 'AI Terminal Matrix (Obsidian & Mint)',
      description: 'Obsidian engineering console aesthetic with matrix grid, model-training tokens and mint accents — ideal for machine learning and MLOps credentials.',
      themeStyle: 'ai_terminal_matrix',
      primaryColor: '#06110e',
      accentColor: '#34d399',
      secondaryColor: '#22d3ee',
      borderStyle: 'cyber_circuit',
      showFatherName: false,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: true,
      isDefault: false,
    },
    {
      id: 'tmpl-ai-royal-gold',
      name: 'AI & Machine Learning Royal Gold',
      description: 'Prestigious ivory and gold certificate with ornate corner flourishes, ceremonial crest seal and classic serif typography for AI & ML distinction.',
      themeStyle: 'ai_ml_royal_gold',
      primaryColor: '#b8912f',
      accentColor: '#b8912f',
      secondaryColor: '#7c5e12',
      borderStyle: 'ornate',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: false,
      isDefault: false,
    },
    {
      id: 'tmpl-ai-cloud-azure',
      name: 'AI Cloud Architecture (Azure Minimal)',
      description: 'Clean corporate azure design with fine engineering grid, generous whitespace and high-legibility typography for AI cloud and data engineering tracks.',
      themeStyle: 'ai_cloud_azure',
      primaryColor: '#0b2545',
      accentColor: '#0ea5e9',
      secondaryColor: '#0369a1',
      borderStyle: 'minimal',
      showFatherName: true,
      showGradeFront: false,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: false,
      isDefault: false,
    },
    {
      id: 'tmpl-ai-vision-spectrum',
      name: 'AI Vision Spectrum (Modern)',
      description: 'Contemporary light certificate framed by a magenta-to-cyan spectrum band, designed for computer vision, robotics and intelligent systems awards.',
      themeStyle: 'ai_vision_spectrum',
      primaryColor: '#191322',
      accentColor: '#d6219b',
      secondaryColor: '#06b6d4',
      borderStyle: 'geometric',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: false,
      isDefault: false,
    },
  ];

  const courses: Course[] = [
    {
      id: 'course-fs-101',
      title: 'Full-Stack Web Development & Cloud Architecture (MERN + TypeScript)',
      code: 'FS-101',
      category: 'Software Engineering',
      duration: '6 Months (480 Academic Hours)',
      description: 'Comprehensive industry program covering modern React 19, TypeScript, Node.js, Express, PostgreSQL / Neon database architecture, Docker containers, and cloud deployment.',
      status: 'active',
      defaultTemplateId: 'tmpl-imperial-gold',
      gradingMethod: 'total' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learningOutcomes: [
        { id: 'oc-fs-1', title: 'Design modular front-end architectures using React 19, TypeScript, and modern component systems', order: 1 },
        { id: 'oc-fs-2', title: 'Architect robust RESTful APIs with Node.js, Express, middleware security, and JWT authorization', order: 2 },
        { id: 'oc-fs-3', title: 'Model complex relational data in PostgreSQL / Neon with indexing and schema migrations', order: 3 },
        { id: 'oc-fs-4', title: 'Implement full-stack state management, optimistic updates, and real-time WebSocket communication', order: 4 },
        { id: 'oc-fs-5', title: 'Containerize multi-tier web applications with Docker and deploy to production cloud platforms with automated CI/CD', order: 5 },
      ],
    },
    {
      id: 'course-ds-201',
      title: 'Data Science, Machine Learning & Applied Artificial Intelligence',
      code: 'DS-201',
      category: 'Data Science & AI',
      duration: '6 Months (480 Academic Hours)',
      description: 'In-depth specialization covering Python data engineering, statistical modeling, machine learning algorithms, deep neural networks, and generative AI deployment.',
      status: 'active',
      defaultTemplateId: 'tmpl-ai-neural',
      gradingMethod: 'total' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learningOutcomes: [
        { id: 'oc-ds-1', title: 'Perform exploratory data analysis and feature engineering on high-dimensional unstructured datasets', order: 1 },
        { id: 'oc-ds-2', title: 'Train, evaluate, and tune supervised and unsupervised machine learning models using Scikit-Learn', order: 2 },
        { id: 'oc-ds-3', title: 'Build computer vision and NLP models using PyTorch, convolutional layers, and Transformer architectures', order: 3 },
        { id: 'oc-ds-4', title: 'Integrate and deploy Large Language Model (LLM) agents, vector embeddings, and RAG pipelines', order: 4 },
        { id: 'oc-ds-5', title: 'Deploy machine learning inference endpoints with FastAPI, Docker, and model monitoring telemetry', order: 5 },
      ],
    },
    {
      id: 'course-do-301',
      title: 'DevOps Engineering, Kubernetes & Multi-Cloud Infrastructure',
      code: 'DO-301',
      category: 'Cloud & Infrastructure',
      duration: '4 Months (320 Academic Hours)',
      description: 'Hands-on enterprise program covering Linux administration, Infrastructure as Code with Terraform, Kubernetes clustering, CI/CD pipelines, and cloud observability.',
      status: 'active',
      defaultTemplateId: 'tmpl-modern-minimal',
      gradingMethod: 'total' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learningOutcomes: [
        { id: 'oc-do-1', title: 'Provision scalable multi-region cloud infrastructure using Terraform and Infrastructure as Code (IaC)', order: 1 },
        { id: 'oc-do-2', title: 'Deploy, scale, and manage production Kubernetes microservices clusters with Helm charts and Ingress controllers', order: 2 },
        { id: 'oc-do-3', title: 'Build automated CI/CD deployment pipelines with automated linting, test suites, and container registry pushing', order: 3 },
        { id: 'oc-do-4', title: 'Implement cluster-wide monitoring, distributed tracing, and log aggregation with Prometheus and Grafana', order: 4 },
        { id: 'oc-do-5', title: 'Enforce enterprise cloud security standards, least-privilege IAM policies, and secret management vaults', order: 5 },
      ],
    },
    {
      id: 'course-ux-401',
      title: 'Advanced UI/UX Product Design & Design Systems Engineering',
      code: 'UX-401',
      category: 'Design & Product',
      duration: '3 Months (240 Academic Hours)',
      description: 'Mastery in user research, design psychology, Figma component token systems, accessibility compliance (WCAG AA), and design-to-code workflow.',
      status: 'active',
      defaultTemplateId: 'tmpl-imperial-gold',
      gradingMethod: 'total' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learningOutcomes: [
        { id: 'oc-ux-1', title: 'Conduct qualitative user research, persona creation, customer journey mapping, and empathy analysis', order: 1 },
        { id: 'oc-ux-2', title: 'Build production-ready design systems in Figma with auto-layout, design tokens, and variant properties', order: 2 },
        { id: 'oc-ux-3', title: 'Design accessible, high-contrast user interfaces strictly conforming to WCAG AA international criteria', order: 3 },
        { id: 'oc-ux-4', title: 'Construct interactive responsive prototypes for web, tablet, and mobile with realistic micro-animations', order: 4 },
        { id: 'oc-ux-5', title: 'Run usability benchmarking tests, synthesize telemetry feedback, and document developer handoff specifications', order: 5 },
      ],
    },
  ];

  return {
    admins: [defaultAdmin],
    students: [],
    courses,
    enrollments: [],
    gradingConfigs: [gradingConfig],
    templates,
    certificates: [],
    settings: defaultSettings,
    auditLogs: [],
  };
}

// ============================================================
// DATABASE SERVICE — Postgres is the source of truth.
// Memory is always overwritten from Postgres on sync.
// Never re-seeds into Postgres (deleted records stay deleted).
// ============================================================
class DatabaseService {
  private data!: DatabaseSchema;
  private initialized = false;

  private pool: pg.Pool | null = null;
  private builtInTemplates: CertificateTemplate[] = [];
  private isConnected = false;
  private dbName = '';
  private dbHost = '';
  private uriMasked = '';
  private dbError: string | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;

    // 1. Baseline memory schema from seed
    this.data = await generateInitialDatabase();
    this.builtInTemplates = this.data.templates;

    // 2. Connect to PostgreSQL
    const postgresUri =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRESQL_URL;

    if (postgresUri && postgresUri.trim()) {
      console.log('🐘 PostgreSQL URI found. Connecting strictly to PostgreSQL database...');
      await this.connectPostgres(postgresUri.trim(), false);
    } else {
      this.dbError = 'DATABASE_URL is not configured. PostgreSQL connection is required.';
      console.warn('⚠️ No PostgreSQL URI provided. System operates strictly with PostgreSQL.');
    }

    this.initialized = true;
  }

  async connectPostgres(
    uri: string,
    saveToEnv = false
  ): Promise<{ success: boolean; message: string; dbName?: string; status?: DatabaseStatus }> {
    const cleanUri = uri.trim();
    if (!cleanUri) {
      return { success: false, message: 'PostgreSQL connection URI is required.' };
    }

    try {
      if (this.pool) {
        try { await this.pool.end(); } catch (_) {}
        this.pool = null;
        this.isConnected = false;
      }

      console.log('🐘 Connecting to PostgreSQL...');
      const newPool = new Pool({
        connectionString: cleanUri,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      });

      const testRes = await newPool.query('SELECT current_database() as db, inet_server_addr() as host, version();');
      const parsedDbName = testRes.rows[0]?.db || 'neondb';

      let parsedHost = '';
      try {
        const parsedUrl = new URL(cleanUri);
        parsedHost = parsedUrl.hostname;
      } catch (_) {
        parsedHost = testRes.rows[0]?.host || 'remote';
      }

      this.pool = newPool;
      this.isConnected = true;
      this.dbName = parsedDbName;
      this.dbHost = parsedHost;
      this.dbError = null;
      this.uriMasked = cleanUri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:••••••••@');

      console.log(`🐘 Connected successfully to PostgreSQL database "${parsedDbName}" on host "${parsedHost}".`);

      if (saveToEnv) {
        this.writeEnvPostgresUri(cleanUri);
      }

      await this.ensureTablesExist();
      await this.insertMissingBuiltInTemplates();
      await this.syncFromPostgres();

      return {
        success: true,
        message: `Successfully connected to PostgreSQL database "${parsedDbName}"`,
        dbName: parsedDbName,
        status: this.getDatabaseStatus(),
      };
    } catch (err: any) {
      console.error('⚠️ PostgreSQL connection failed:', err?.message || err);
      this.dbError = err?.message || 'Failed to connect to PostgreSQL database';
      this.isConnected = false;
      return {
        success: false,
        message: err?.message || 'Failed to connect to PostgreSQL. Please check connection string, credentials, and network access.',
        status: this.getDatabaseStatus(),
      };
    }
  }

  async disconnectPostgres(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.pool) {
        await this.pool.end();
      }
      this.pool = null;
      this.isConnected = false;
      this.dbError = 'Database disconnected';
      this.uriMasked = '';
      this.dbName = '';
      this.dbHost = '';
      console.log('🔌 Disconnected from PostgreSQL.');
      return { success: true, message: 'Disconnected from PostgreSQL.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error disconnecting from PostgreSQL' };
    }
  }

  private writeEnvPostgresUri(uri: string): void {
    process.env.DATABASE_URL = uri;
    process.env.POSTGRES_URL = uri;
    try {
      let content = '';
      if (fs.existsSync(ENV_FILE)) {
        content = fs.readFileSync(ENV_FILE, 'utf-8');
      }

      if (/^DATABASE_URL=.*/m.test(content)) {
        content = content.replace(/^DATABASE_URL=.*/m, `DATABASE_URL="${uri}"`);
      } else {
        content = content ? `${content.trim()}\n\nDATABASE_URL="${uri}"\n` : `DATABASE_URL="${uri}"\n`;
      }

      if (/^POSTGRES_URL=.*/m.test(content)) {
        content = content.replace(/^POSTGRES_URL=.*/m, `POSTGRES_URL="${uri}"`);
      } else {
        content = `${content.trim()}\nPOSTGRES_URL="${uri}"\n`;
      }

      fs.writeFileSync(ENV_FILE, content, 'utf-8');
      console.log('✅ Updated DATABASE_URL in .env file.');
    } catch (err) {
      console.warn('Notice: Could not write to .env file (runtime env updated):', err);
    }
  }

  // Ensure all 9 relational tables exist in PostgreSQL
  private async ensureTablesExist(): Promise<void> {
    if (!this.pool) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        student_id_number TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        father_name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        email TEXT,
        cnic_or_national_id TEXT,
        address TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        duration TEXT NOT NULL,
        description TEXT,
        learning_outcomes JSONB DEFAULT '[]'::jsonb,
        status TEXT DEFAULT 'active',
        default_template_id TEXT,
        grading_method TEXT DEFAULT 'total',
        passing_percentage NUMERIC DEFAULT 50,
        assessment_parameters JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        enrollment_date TEXT,
        status TEXT DEFAULT 'in_progress',
        completion_date TEXT,
        certificate_id TEXT,
        marks JSONB DEFAULT '{}'::jsonb,
        calculated_percentage NUMERIC,
        calculated_grade TEXT,
        calculated_result TEXT,
        is_eligible_for_certificate BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS grading_configs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        method TEXT NOT NULL,
        passing_percentage NUMERIC DEFAULT 50,
        is_default BOOLEAN DEFAULT false,
        parameters JSONB DEFAULT '[]'::jsonb,
        rules JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        theme_style TEXT NOT NULL,
        primary_color TEXT,
        accent_color TEXT,
        secondary_color TEXT,
        border_style TEXT,
        show_father_name BOOLEAN DEFAULT true,
        show_grade_front BOOLEAN DEFAULT true,
        show_seal BOOLEAN DEFAULT true,
        show_qr BOOLEAN DEFAULT true,
        show_signatures BOOLEAN DEFAULT true,
        show_floating_code_signs BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS certificates (
        id TEXT PRIMARY KEY,
        serial_number TEXT UNIQUE NOT NULL,
        verification_id TEXT UNIQUE NOT NULL,
        student_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        enrollment_id TEXT,
        template_id TEXT,
        issue_date TEXT,
        completion_date TEXT,
        status TEXT DEFAULT 'VALID',
        revocation_reason TEXT,
        revoked_at TIMESTAMPTZ,
        revoked_by TEXT,
        qr_code_data_url TEXT,
        verification_url TEXT,
        snapshot JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS institute_settings (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT
      );
    `);
  }

  // Adds newly shipped built-in certificate designs to an existing database
  // without touching or overwriting any template row the institute already owns.
  private async insertMissingBuiltInTemplates(): Promise<void> {
    if (!this.pool || !this.isConnected || this.builtInTemplates.length === 0) return;

    let inserted = 0;
    for (const template of this.builtInTemplates) {
      const result = await this.pool.query(
        `INSERT INTO templates (id, name, description, theme_style, primary_color, accent_color, secondary_color, border_style, show_father_name, show_grade_front, show_seal, show_qr, show_signatures, show_floating_code_signs, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING;`,
        [
          template.id,
          template.name,
          template.description,
          template.themeStyle,
          template.primaryColor,
          template.accentColor,
          template.secondaryColor,
          template.borderStyle,
          template.showFatherName !== false,
          template.showGradeFront !== false,
          template.showSeal !== false,
          template.showQR !== false,
          template.showSignatures !== false,
          template.showFloatingCodeSigns !== false,
          Boolean(template.isDefault),
        ]
      );
      inserted += result.rowCount || 0;
    }

    if (inserted > 0) {
      console.log(`🎨 Added ${inserted} new built-in certificate template(s) to PostgreSQL.`);
    }
  }

  // ============================================================
  // PULL from Postgres → memory (source of truth).
  // ALWAYS overwrites all arrays, even when empty — so deletions persist.
  // ============================================================
  private async syncFromPostgres(): Promise<void> {
    if (!this.pool || !this.isConnected) return;

    try {
      const [
        adminsRes,
        studentsRes,
        coursesRes,
        enrollmentsRes,
        gradingRes,
        templatesRes,
        certificatesRes,
        settingsRes,
        auditRes,
      ] = await Promise.all([
        this.pool.query('SELECT * FROM admins;'),
        this.pool.query('SELECT * FROM students ORDER BY created_at DESC;'),
        this.pool.query('SELECT * FROM courses ORDER BY code ASC;'),
        this.pool.query('SELECT * FROM enrollments;'),
        this.pool.query('SELECT * FROM grading_configs;'),
        this.pool.query('SELECT * FROM templates;'),
        this.pool.query('SELECT * FROM certificates ORDER BY created_at DESC;'),
        this.pool.query('SELECT data FROM institute_settings WHERE id = $1;', ['main']),
        this.pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500;'),
      ]);

      // Always overwrite — empty Postgres table = empty memory (deletions persist)
      this.data.admins = adminsRes.rows.map((r) => ({
        id: r.id,
        email: r.email,
        passwordHash: r.password_hash,
        name: r.name,
        role: r.role,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        lastLogin: r.last_login ? new Date(r.last_login).toISOString() : undefined,
      }));

      this.data.students = studentsRes.rows.map((r) => ({
        id: r.id,
        studentIdNumber: r.student_id_number,
        fullName: r.full_name,
        fatherName: r.father_name,
        phoneNumber: r.phone_number,
        email: r.email || undefined,
        cnicOrNationalId: r.cnic_or_national_id || undefined,
        address: r.address || undefined,
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));

      this.data.courses = coursesRes.rows.map((r) => ({
        id: r.id,
        title: r.title,
        code: r.code,
        category: r.category,
        duration: r.duration,
        description: r.description,
        learningOutcomes: r.learning_outcomes || [],
        status: r.status,
        defaultTemplateId: r.default_template_id,
        gradingMethod: r.grading_method,
        passingPercentage: Number(r.passing_percentage) || 50,
        assessmentParameters: r.assessment_parameters || [],
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));

      this.data.enrollments = enrollmentsRes.rows.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        courseId: r.course_id,
        enrollmentDate: r.enrollment_date,
        status: r.status,
        completionDate: r.completion_date || undefined,
        certificateId: r.certificate_id || undefined,
        marks: r.marks || {},
        calculatedPercentage: r.calculated_percentage ? Number(r.calculated_percentage) : undefined,
        calculatedGrade: r.calculated_grade || undefined,
        calculatedResult: r.calculated_result || undefined,
        isEligibleForCertificate: Boolean(r.is_eligible_for_certificate),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));

      this.data.gradingConfigs = gradingRes.rows.map((r) => ({
        id: r.id,
        title: r.title,
        method: r.method,
        passingPercentage: Number(r.passing_percentage) || 50,
        isDefault: Boolean(r.is_default),
        parameters: r.parameters || [],
        rules: r.rules || [],
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));

      this.data.templates = templatesRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        themeStyle: r.theme_style,
        primaryColor: r.primary_color,
        accentColor: r.accent_color,
        secondaryColor: r.secondary_color,
        borderStyle: r.border_style,
        showFatherName: r.show_father_name,
        showGradeFront: r.show_grade_front,
        showSeal: r.show_seal,
        showQR: r.show_qr,
        showSignatures: r.show_signatures,
        showFloatingCodeSigns: r.show_floating_code_signs,
        isDefault: Boolean(r.is_default),
      }));

      this.data.certificates = certificatesRes.rows.map((r) => ({
        id: r.id,
        serialNumber: r.serial_number,
        verificationId: r.verification_id,
        studentId: r.student_id,
        courseId: r.course_id,
        enrollmentId: r.enrollment_id || '',
        issueDate: r.issue_date,
        completionDate: r.completion_date || '',
        status: r.status,
        revocationReason: r.revocation_reason || undefined,
        revokedAt: r.revoked_at ? new Date(r.revoked_at).toISOString() : undefined,
        revokedBy: r.revoked_by || undefined,
        issuedBy: r.snapshot?.metadata?.issuedBy || 'Tech For You Registrar',
        qrCodeDataUrl: r.qr_code_data_url,
        verificationUrl: r.verification_url,
        snapshot: r.snapshot,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));

      if (settingsRes.rows.length > 0 && settingsRes.rows[0]?.data) {
        this.data.settings = settingsRes.rows[0].data;
      }

      this.data.auditLogs = auditRes.rows.map((r) => ({
        id: r.id,
        timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
        actor: r.actor,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id || undefined,
        details: r.details,
        ipAddress: r.ip_address || undefined,
      }));

      console.log(
        `✅ Synced from PostgreSQL — admins:${this.data.admins.length} students:${this.data.students.length} courses:${this.data.courses.length} enrollments:${this.data.enrollments.length} certificates:${this.data.certificates.length}`
      );
    } catch (err) {
      console.error('❌ Failed to load data from PostgreSQL:', err);
      throw err;
    }
  }

  // Accessors
  get admins(): AdminUser[] { return this.data.admins; }
  get students(): Student[] { return this.data.students; }
  get courses(): Course[] { return this.data.courses; }
  get enrollments(): Enrollment[] { return this.data.enrollments; }
  get gradingConfigs(): GradingConfiguration[] { return this.data.gradingConfigs; }
  get templates(): CertificateTemplate[] { return this.data.templates; }
  get certificates(): Certificate[] { return this.data.certificates; }
  get settings(): InstituteSettings { return this.data.settings; }
  get auditLogs(): AuditLog[] { return this.data.auditLogs; }

  get isPostgres(): boolean { return this.isConnected; }
  get postgresDbName(): string { return this.dbName; }

  // Setters for memory reference replacement
  set enrollments(val: Enrollment[]) { this.data.enrollments = val; }
  set students(val: Student[]) { this.data.students = val; }
  set certificates(val: Certificate[]) { this.data.certificates = val; }
  set courses(val: Course[]) { this.data.courses = val; }

  // ============================================================
  // WRITE PATH — Postgres is written FIRST and every failure is
  // thrown back to the caller. Memory is only touched after the
  // database accepted the change, so a rejected write can never be
  // reported as a success and can never be re-applied later.
  // ============================================================

  private requirePool(): pg.Pool {
    if (!this.pool || !this.isConnected) {
      throw new Error('PostgreSQL is not connected. Data changes are disabled until the database is available.');
    }
    return this.pool;
  }

  async insertStudent(student: Student): Promise<void> {
    await this.requirePool().query(
      `INSERT INTO students (id, student_id_number, full_name, father_name, phone_number, email, cnic_or_national_id, address, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET student_id_number=$2, full_name=$3, father_name=$4, phone_number=$5, email=$6, cnic_or_national_id=$7, address=$8, status=$9, updated_at=$11;`,
      [student.id, student.studentIdNumber, student.fullName, student.fatherName, student.phoneNumber, student.email || null, student.cnicOrNationalId || null, student.address || null, student.status || 'active', student.createdAt, student.updatedAt]
    );
    this.data.students = this.data.students.filter((s) => s.id !== student.id);
    this.data.students.unshift(student);
  }

  async updateStudent(student: Student): Promise<void> {
    const result = await this.requirePool().query(
      `UPDATE students SET student_id_number=$2, full_name=$3, father_name=$4, phone_number=$5, email=$6, cnic_or_national_id=$7, address=$8, status=$9, updated_at=$10 WHERE id=$1;`,
      [student.id, student.studentIdNumber, student.fullName, student.fatherName, student.phoneNumber, student.email || null, student.cnicOrNationalId || null, student.address || null, student.status || 'active', student.updatedAt]
    );
    if (result.rowCount === 0) {
      throw new Error('Student no longer exists. It may have been deleted in another session.');
    }
    const idx = this.data.students.findIndex((s) => s.id === student.id);
    if (idx !== -1) {
      this.data.students[idx] = student;
    } else {
      this.data.students.unshift(student);
    }
  }

  async deleteStudent(studentId: string): Promise<void> {
    await this.requirePool().query('DELETE FROM students WHERE id = $1;', [studentId]);
    this.data.students = this.data.students.filter((s) => s.id !== studentId);
  }

  async insertCertificate(cert: Certificate): Promise<void> {
    await this.requirePool().query(
      `INSERT INTO certificates (id, serial_number, verification_id, student_id, course_id, enrollment_id, template_id, issue_date, completion_date, status, revocation_reason, revoked_at, revoked_by, qr_code_data_url, verification_url, snapshot, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (id) DO UPDATE SET serial_number=$2, verification_id=$3, student_id=$4, course_id=$5, enrollment_id=$6, template_id=$7, issue_date=$8, completion_date=$9, status=$10, revocation_reason=$11, revoked_at=$12, revoked_by=$13, qr_code_data_url=$14, verification_url=$15, snapshot=$16, updated_at=$18;`,
      [cert.id, cert.serialNumber, cert.verificationId, cert.studentId, cert.courseId, cert.enrollmentId || null, cert.snapshot?.template?.id || null, cert.issueDate, cert.completionDate || null, cert.status || 'VALID', cert.revocationReason || null, cert.revokedAt || null, cert.revokedBy || null, cert.qrCodeDataUrl, cert.verificationUrl, JSON.stringify(cert.snapshot), cert.createdAt, cert.updatedAt]
    );
    this.data.certificates = this.data.certificates.filter((c) => c.id !== cert.id);
    this.data.certificates.unshift(cert);
  }

  async deleteCertificate(certId: string): Promise<void> {
    await this.requirePool().query('DELETE FROM certificates WHERE id = $1;', [certId]);
    this.data.certificates = this.data.certificates.filter((c) => c.id !== certId);
  }

  async insertCourse(course: Course): Promise<void> {
    await this.requirePool().query(
      `INSERT INTO courses (id, title, code, category, duration, description, learning_outcomes, status, default_template_id, grading_method, passing_percentage, assessment_parameters, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET title=$2, code=$3, category=$4, duration=$5, description=$6, learning_outcomes=$7, status=$8, default_template_id=$9, grading_method=$10, passing_percentage=$11, assessment_parameters=$12, updated_at=$14;`,
      [course.id, course.title, course.code, course.category, course.duration, course.description || '', JSON.stringify(course.learningOutcomes || []), course.status || 'active', course.defaultTemplateId || 'tmpl-web-development', course.gradingMethod || 'total', Number(course.passingPercentage) || 50, JSON.stringify(course.assessmentParameters || []), course.createdAt, course.updatedAt]
    );
    this.data.courses = this.data.courses.filter((c) => c.id !== course.id);
    this.data.courses.unshift(course);
  }

  async updateCourse(course: Course): Promise<void> {
    const result = await this.requirePool().query(
      `UPDATE courses SET title=$2, code=$3, category=$4, duration=$5, description=$6, learning_outcomes=$7, status=$8, default_template_id=$9, grading_method=$10, passing_percentage=$11, assessment_parameters=$12, updated_at=$13 WHERE id=$1;`,
      [course.id, course.title, course.code, course.category, course.duration, course.description || '', JSON.stringify(course.learningOutcomes || []), course.status || 'active', course.defaultTemplateId || 'tmpl-web-development', course.gradingMethod || 'total', Number(course.passingPercentage) || 50, JSON.stringify(course.assessmentParameters || []), course.updatedAt]
    );
    if (result.rowCount === 0) {
      throw new Error('Course no longer exists. It may have been deleted in another session.');
    }
    const idx = this.data.courses.findIndex((c) => c.id === course.id);
    if (idx !== -1) {
      this.data.courses[idx] = course;
    } else {
      this.data.courses.unshift(course);
    }
  }

  async deleteCourse(courseId: string): Promise<void> {
    await this.requirePool().query('DELETE FROM courses WHERE id = $1;', [courseId]);
    this.data.courses = this.data.courses.filter((c) => c.id !== courseId);
  }

  async saveEnrollment(enrollment: Enrollment): Promise<void> {
    await this.requirePool().query(
      `INSERT INTO enrollments (id, student_id, course_id, enrollment_date, status, completion_date, certificate_id, marks, calculated_percentage, calculated_grade, calculated_result, is_eligible_for_certificate, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET status=$5, completion_date=$6, certificate_id=$7, marks=$8, calculated_percentage=$9, calculated_grade=$10, calculated_result=$11, is_eligible_for_certificate=$12, updated_at=$14;`,
      [enrollment.id, enrollment.studentId, enrollment.courseId, enrollment.enrollmentDate, enrollment.status, enrollment.completionDate || null, enrollment.certificateId || null, JSON.stringify(enrollment.marks || {}), enrollment.calculatedPercentage || null, enrollment.calculatedGrade || null, enrollment.calculatedResult || null, Boolean(enrollment.isEligibleForCertificate), enrollment.createdAt, enrollment.updatedAt]
    );
    const idx = this.data.enrollments.findIndex((e) => e.id === enrollment.id);
    if (idx !== -1) {
      this.data.enrollments[idx] = enrollment;
    } else {
      this.data.enrollments.unshift(enrollment);
    }
  }

  async deleteEnrollment(enrollmentId: string): Promise<void> {
    await this.requirePool().query('DELETE FROM enrollments WHERE id = $1;', [enrollmentId]);
    this.data.enrollments = this.data.enrollments.filter((e) => e.id !== enrollmentId);
  }

  async saveSettings(settings: InstituteSettings): Promise<void> {
    await this.requirePool().query(
      `INSERT INTO institute_settings (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = $2;`,
      ['main', JSON.stringify(settings)]
    );
    this.data.settings = settings;
  }

  async saveGradingConfig(config: GradingConfiguration): Promise<void> {
    await this.requirePool().query(
      `INSERT INTO grading_configs (id, title, method, passing_percentage, is_default, parameters, rules, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET title=$2, method=$3, passing_percentage=$4, is_default=$5, parameters=$6, rules=$7, updated_at=$9;`,
      [config.id, config.title, config.method, Number(config.passingPercentage) || 50, Boolean(config.isDefault), JSON.stringify(config.parameters || []), JSON.stringify(config.rules || []), config.createdAt, config.updatedAt]
    );
    const idx = this.data.gradingConfigs.findIndex((g) => g.id === config.id);
    if (idx !== -1) {
      this.data.gradingConfigs[idx] = config;
    } else {
      this.data.gradingConfigs.push(config);
    }
  }

  async saveTemplate(template: CertificateTemplate): Promise<void> {
    await this.requirePool().query(
      `INSERT INTO templates (id, name, description, theme_style, primary_color, accent_color, secondary_color, border_style, show_father_name, show_grade_front, show_seal, show_qr, show_signatures, show_floating_code_signs, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, theme_style=$4, primary_color=$5, accent_color=$6, secondary_color=$7, border_style=$8, show_father_name=$9, show_grade_front=$10, show_seal=$11, show_qr=$12, show_signatures=$13, show_floating_code_signs=$14, is_default=$15;`,
      [template.id, template.name, template.description, template.themeStyle, template.primaryColor, template.accentColor, template.secondaryColor, template.borderStyle, template.showFatherName !== false, template.showGradeFront !== false, template.showSeal !== false, template.showQR !== false, template.showSignatures !== false, template.showFloatingCodeSigns !== false, Boolean(template.isDefault)]
    );
    const idx = this.data.templates.findIndex((t) => t.id === template.id);
    if (idx !== -1) {
      this.data.templates[idx] = template;
    } else {
      this.data.templates.push(template);
    }
  }

  async updateAdmin(admin: AdminUser): Promise<void> {
    const result = await this.requirePool().query(
      `UPDATE admins SET email=$2, password_hash=$3, name=$4, role=$5, last_login=$6 WHERE id=$1;`,
      [admin.id, admin.email, admin.passwordHash, admin.name, admin.role, admin.lastLogin || null]
    );
    if (result.rowCount === 0) {
      throw new Error('Admin account not found in the database.');
    }
    const idx = this.data.admins.findIndex((a) => a.id === admin.id);
    if (idx !== -1) {
      this.data.admins[idx] = admin;
    }
  }

  // Reload the memory snapshot from Postgres before serving a request.
  // Serverless instances do not share memory, so reads must never trust
  // a snapshot that another instance may already have invalidated.
  async ensureFresh(): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    await this.syncFromPostgres();
  }

  // Force re-sync from Postgres → memory (no restart required)
  async refreshFromPostgres(): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    await this.syncFromPostgres();
  }

  getDatabaseStatus(): DatabaseStatus {
    return {
      mode: 'postgres',
      connected: this.isConnected,
      databaseName: this.dbName || undefined,
      host: this.dbHost || undefined,
      uriMasked: this.uriMasked || undefined,
      error: this.dbError,
      counts: {
        admins: this.data?.admins?.length || 0,
        students: this.data?.students?.length || 0,
        courses: this.data?.courses?.length || 0,
        enrollments: this.data?.enrollments?.length || 0,
        certificates: this.data?.certificates?.length || 0,
        auditLogs: this.data?.auditLogs?.length || 0,
      },
    };
  }

  addAuditLog(actor: string, action: string, entityType: AuditLog['entityType'], entityId: string | undefined, details: string, ipAddress?: string): void {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      entityType,
      entityId,
      details,
      ipAddress,
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    if (this.pool && this.isConnected) {
      this.pool.query(
        `INSERT INTO audit_logs (id, timestamp, actor, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING;`,
        [log.id, log.timestamp, log.actor, log.action, log.entityType || null, log.entityId || null, log.details || '', log.ipAddress || null]
      ).catch((err) => console.error('PostgreSQL audit log error:', err));
    }
  }
}

export const db = new DatabaseService();
