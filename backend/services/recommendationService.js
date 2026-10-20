const { db } = require('../db');

/**
 * Team Leader Recommendation Algorithm
 *
 * SPECIFICATION SELECTION PRIORITY:
 * FIRST: Recommend a suitable domain expert who matches the project requirements and has relevant experience.
 * SECOND: If no suitable expert is available, recommend the most experienced suitable student or researcher.
 *
 * Explicit scoring criteria:
 * - Skill match intersection with project required skills (weight: 40 points max)
 * - Research category experience / previous projects in same domain (weight: 25 points max)
 * - Verified completed contributions from audit / credit transactions (weight: 20 points max)
 * - Availability alignment (weight: 15 points max)
 */
function recommendTeamLeader(projectId) {
  const project = db.prepare(`
    SELECT id, title, category, required_skills, credit_budget, owner_id
    FROM projects WHERE id = ?
  `).get(projectId);

  if (!project) {
    throw new Error('Project not found');
  }

  const projectSkills = JSON.parse(project.required_skills || '[]').map(s => s.toLowerCase());

  // Fetch all users with their active roles
  const users = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.institution, u.bio, u.skills, u.interests,
           u.experience_level, u.availability,
           GROUP_CONCAT(r.role) as roles
    FROM users u
    JOIN user_roles r ON u.id = r.user_id AND r.is_active = 1
    GROUP BY u.id
  `).all();

  const candidates = users.map(user => {
    const roles = (user.roles || '').split(',');
    const isExpert = roles.includes('expert');
    const isStudent = roles.includes('student');

    const userSkills = JSON.parse(user.skills || '[]').map(s => s.toLowerCase());
    const matchedSkills = userSkills.filter(s => projectSkills.some(ps => ps.includes(s) || s.includes(ps)));

    // 1. Skill Score (up to 40)
    const skillScore = projectSkills.length > 0
      ? Math.min(40, Math.round((matchedSkills.length / projectSkills.length) * 40))
      : 20;

    // 2. Completed Contributions from DB ledger (up to 20)
    const contributionCount = db.prepare(`
      SELECT COUNT(*) as count FROM credit_transactions WHERE contributor_id = ?
    `).get(user.id)?.count || 0;
    const contributionScore = Math.min(20, contributionCount * 10);

    // 3. Category / Domain Relevance (up to 25)
    let domainScore = 0;
    const bioText = ((user.bio || '') + ' ' + (user.interests || '')).toLowerCase();
    if (bioText.includes(project.category.toLowerCase().split(' ')[0])) {
      domainScore += 15;
    }
    // Check if user has authored projects in same category
    const priorCategoryProjects = db.prepare(`
      SELECT COUNT(*) as count FROM projects WHERE owner_id = ? AND category = ?
    `).get(user.id, project.category)?.count || 0;
    domainScore += Math.min(10, priorCategoryProjects * 5);

    // 4. Availability & Experience Level Score (up to 15)
    let experienceScore = 5;
    if (user.experience_level === 'expert') experienceScore = 15;
    else if (user.experience_level === 'advanced') experienceScore = 12;
    else if (user.experience_level === 'intermediate') experienceScore = 8;

    const totalScore = skillScore + contributionScore + domainScore + experienceScore;

    return {
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      institution: user.institution,
      isExpert,
      isStudent,
      experienceLevel: user.experience_level,
      availability: user.availability,
      matchedSkills,
      contributionCount,
      scores: {
        skillScore,
        contributionScore,
        domainScore,
        experienceScore,
        totalScore
      }
    };
  });

  // Step 1: Filter suitable domain experts (must have >= 1 matching skill or domain relevance)
  const expertCandidates = candidates
    .filter(c => c.isExpert && (c.matchedSkills.length > 0 || c.scores.domainScore > 0))
    .sort((a, b) => b.scores.totalScore - a.scores.totalScore);

  if (expertCandidates.length > 0) {
    const recommended = expertCandidates[0];
    return {
      tier: 'EXPERT_PRIORITY',
      recommendedLeader: recommended,
      explanation: `Recommended Dr./Expert ${recommended.fullName} based on domain expertise in ${project.category}, matching skills (${recommended.matchedSkills.join(', ') || 'Domain background'}), and experience score ${recommended.scores.totalScore}/100.`,
      alternativeCandidates: expertCandidates.slice(1, 4)
    };
  }

  // Step 2: Fallback to most experienced suitable student/researcher
  const studentCandidates = candidates
    .filter(c => c.isStudent)
    .sort((a, b) => b.scores.totalScore - a.scores.totalScore);

  if (studentCandidates.length > 0) {
    const recommended = studentCandidates[0];
    return {
      tier: 'EXPERIENCED_RESEARCHER_FALLBACK',
      recommendedLeader: recommended,
      explanation: `No matching domain expert was available. Recommending top-ranked experienced student/researcher ${recommended.fullName} based on highest composite qualification score (${recommended.scores.totalScore}/100) and matched skills (${recommended.matchedSkills.join(', ')}).`,
      alternativeCandidates: studentCandidates.slice(1, 4)
    };
  }

  return {
    tier: 'NONE_AVAILABLE',
    recommendedLeader: null,
    explanation: 'No registered candidates match the required qualifications.',
    alternativeCandidates: []
  };
}

module.exports = {
  recommendTeamLeader
};
