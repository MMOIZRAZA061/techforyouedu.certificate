import { AssessmentParameter, GradeRule, GradingConfiguration } from './types.js';

export interface CalculationResult {
  parameterBreakdown: Array<{
    parameterId: string;
    name: string;
    maxMarks: number;
    obtainedMarks: number;
    percentage: number;
  }>;
  totalMaxMarks: number;
  totalObtainedMarks: number;
  overallPercentage: number;
  grade: string;
  result: string;
  isPassed: boolean;
  passingPercentage: number;
}

export function calculateEnrollmentGrades(
  config: GradingConfiguration,
  obtainedMarksMap: Record<string, number>
): CalculationResult {
  const method = config.method || 'total';
  const parameters = config.parameters || [];
  const rules = [...(config.rules || [])].sort((a, b) => b.minPercentage - a.minPercentage);
  const passingPercentage = config.passingPercentage ?? 50;

  let totalMaxMarks = 0;
  let totalObtainedMarks = 0;

  const parameterBreakdown = parameters.map((param) => {
    const rawObtained = obtainedMarksMap[param.id] ?? 0;
    const obtainedMarks = Number(rawObtained);
    const obtained = Math.min(Math.max(0, isNaN(obtainedMarks) ? 0 : obtainedMarks), param.maxMarks);
    const percentage = param.maxMarks > 0 ? (obtained / param.maxMarks) * 100 : 0;

    totalMaxMarks += param.maxMarks;
    totalObtainedMarks += obtained;

    return {
      parameterId: param.id,
      name: param.name,
      maxMarks: param.maxMarks,
      obtainedMarks: obtained,
      percentage: Number(percentage.toFixed(2)),
    };
  });

  let overallPercentage = 0;

  // Total marks percentage (only method supported)
  if (totalMaxMarks > 0) {
    overallPercentage = Number(((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2));
  }
  // method === 'total' is the only supported method; weighted is ignored

  // Determine Grade and Result
  let assignedRule: GradeRule | undefined;
  for (const rule of rules) {
    if (overallPercentage >= rule.minPercentage) {
      assignedRule = rule;
      break;
    }
  }

  if (!assignedRule && rules.length > 0) {
    assignedRule = rules[rules.length - 1]; // Lowest fallback (e.g. F)
  }

  const isPassed = overallPercentage >= passingPercentage && (assignedRule ? assignedRule.isPassing : false);
  const grade = assignedRule ? assignedRule.grade : (isPassed ? 'P' : 'F');
  const result = assignedRule ? assignedRule.resultLabel : (isPassed ? 'Pass' : 'Fail');

  return {
    parameterBreakdown,
    totalMaxMarks,
    totalObtainedMarks,
    overallPercentage,
    grade,
    result,
    isPassed,
    passingPercentage,
  };
}

export function validateGradingConfiguration(config: Partial<GradingConfiguration>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.title?.trim()) {
    errors.push('Configuration title is required.');
  }

  if (config.passingPercentage === undefined || config.passingPercentage < 0 || config.passingPercentage > 100) {
    errors.push('Passing percentage must be between 0 and 100.');
  }

  if (!config.parameters || config.parameters.length === 0) {
    errors.push('At least one assessment parameter is required.');
  } else {
    config.parameters.forEach((param, i) => {
      if (!param.name?.trim()) errors.push(`Parameter #${i + 1} requires a name.`);
      if (!param.maxMarks || param.maxMarks <= 0) errors.push(`Parameter "${param.name || `#${i + 1}`}" maximum marks must be greater than 0.`);
    });

    // Weighted grading is no longer supported; only 'total' method is used
  }

  if (!config.rules || config.rules.length === 0) {
    errors.push('At least one grading rule threshold is required.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
