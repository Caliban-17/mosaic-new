/**
 * Utility for calculating and managing intellectual property rights 
 * allocations for creative projects and collaborations
 */

const IPRightsUtils = {
    /**
     * Calculate intellectual property rights distribution for a creative project
     * @param {Object} project - The creative project with contributors
     * @returns {Array} - Array of contributors with allocated percentages
     */
    calculateRightsAllocation(project) {
      if (!project || !project.contributors || project.contributors.length === 0) {
        return [];
      }
      
      // Define weights for different contribution types
      // For creative projects, we value conceptual work more highly
      const CONCEPT_WEIGHT = 0.4;  // 40% weight to conceptual contribution
      const EXECUTION_WEIGHT = 0.6; // 60% weight to execution contribution
      
      // Calculate weighted scores for each contributor
      const contributorScores = project.contributors.map(contributor => {
        // Calculate weighted contribution score
        const conceptScore = (contributor.conceptCredit || 0) * CONCEPT_WEIGHT;
        const executionScore = (contributor.contributions || 0) * EXECUTION_WEIGHT;
        const totalScore = conceptScore + executionScore;
        
        return {
          ...contributor,
          conceptScore,
          executionScore,
          weightedScore: totalScore
        };
      });
      
      // Calculate total weighted score
      const totalWeightedScore = contributorScores.reduce(
        (sum, contributor) => sum + contributor.weightedScore, 
        0
      );
      
      // Calculate percentage allocations
      return contributorScores.map(contributor => ({
        ...contributor,
        allocationPercentage: totalWeightedScore > 0 
          ? (contributor.weightedScore / totalWeightedScore) * 100 
          : 0
      }))
      .sort((a, b) => b.allocationPercentage - a.allocationPercentage);
    },
    
    /**
     * Calculate IP rights changes when creating a splinter or fragment
     * @param {Object} originalProject - The original project
     * @param {Object} derivedProject - The splinter or fragment project
     * @param {String} derivationType - Type of derivation ('splinter' or 'fragment')
     * @returns {Object} - Updated IP rights allocations
     */
    calculateDerivedRights(originalProject, derivedProject, derivationType) {
      // Get the original contributors with their allocations
      const originalContributors = originalProject.contributors || [];
      
      // Get the new contributors for the derived work
      const newContributors = derivedProject.contributors || [];
      
      // Determine original work valuation factor based on type
      // Splinters maintain more of the original value than fragments
      const originalValueFactor = derivationType === 'splinter' ? 0.7 : 0.4;
      
      // Combine original and new contributors
      const combinedContributors = [...originalContributors].map(c => ({
        ...c,
        // Scale down original contributions based on derivation type
        conceptCredit: c.conceptCredit * originalValueFactor,
        contributions: c.contributions * originalValueFactor
      }));
      
      // Add new contributors
      newContributors.forEach(newContributor => {
        // Check if contributor already exists
        const existingIndex = combinedContributors.findIndex(
          c => c.id === newContributor.id
        );
        
        if (existingIndex >= 0) {
          // Add to existing contributor's scores
          combinedContributors[existingIndex].conceptCredit += newContributor.conceptCredit || 0;
          combinedContributors[existingIndex].contributions += newContributor.contributions || 0;
        } else {
          // Add new contributor
          combinedContributors.push(newContributor);
        }
      });
      
      // Calculate final allocation using the regular algorithm
      const projectWithCombinedContributors = {
        ...derivedProject,
        contributors: combinedContributors
      };
      
      return this.calculateRightsAllocation(projectWithCombinedContributors);
    },
    
    /**
     * Generate a visual representation of IP rights allocation
     * @param {Array} contributors - Contributors with allocation percentages
     * @returns {Object} - Visual mapping data for rendering
     */
    generateAllocationVisual(contributors) {
      if (!contributors || contributors.length === 0) {
        return { segments: [] };
      }
      
      // Sort by allocation percentage descending
      const sortedContributors = [...contributors]
        .sort((a, b) => b.allocationPercentage - a.allocationPercentage);
      
      // Generate color mapping
      const segments = sortedContributors.map((contributor, index) => {
        // Generate unique colors
        const hue = (index * 137.5) % 360; // Use golden ratio to distribute colors
        return {
          id: contributor.id,
          name: contributor.name,
          role: contributor.role,
          percentage: contributor.allocationPercentage,
          color: `hsl(${hue}, 70%, 65%)`,
          // Calculate concept vs execution breakdown
          conceptPercentage: contributor.conceptScore / contributor.weightedScore * 100,
          executionPercentage: contributor.executionScore / contributor.weightedScore * 100
        };
      });
      
      return {
        segments,
        totalContributors: contributors.length
      };
    },
    
    /**
     * Estimates potential revenue sharing based on IP allocation
     * @param {Array} rightAllocation - Rights allocation data
     * @param {Number} potentialRevenue - Potential revenue amount
     * @returns {Array} - Contributors with revenue shares
     */
    calculateRevenueSharing(rightAllocation, potentialRevenue) {
      if (!rightAllocation || !potentialRevenue) return [];
      
      return rightAllocation.map(contributor => ({
        ...contributor,
        revenueShare: (contributor.allocationPercentage / 100) * potentialRevenue
      }));
    },
    
    /**
     * Recommend optimal IP rights split for different creative project types
     * @param {String} projectType - Type of creative project
     * @param {Array} contributors - Array of contributors with roles
     * @returns {Object} - Recommended IP rights allocation
     */
    recommendRightsSplit(projectType, contributors) {
      if (!contributors || contributors.length === 0) return {};
      
      // Different creative fields have different norms for IP rights
      const typeWeights = {
        'publication': { concept: 0.35, execution: 0.65 },
        'video': { concept: 0.3, execution: 0.7 },
        'essay': { concept: 0.5, execution: 0.5 },
        'artwork': { concept: 0.4, execution: 0.6 },
        'poetry': { concept: 0.6, execution: 0.4 },
        'music': { concept: 0.5, execution: 0.5 },
        'photography': { concept: 0.3, execution: 0.7 },
        'design': { concept: 0.4, execution: 0.6 }
      };
      
      // Use default weights if type not found
      const weights = typeWeights[projectType] || { concept: 0.4, execution: 0.6 };
      
      // Role-based contribution estimates
      const roleEstimates = {
        'Writer': { concept: 0.6, execution: 0.7 },
        'Editor': { concept: 0.3, execution: 0.5 },
        'Designer': { concept: 0.7, execution: 0.8 },
        'Artist': { concept: 0.8, execution: 0.9 },
        'Photographer': { concept: 0.4, execution: 0.9 },
        'Director': { concept: 0.8, execution: 0.6 },
        'Researcher': { concept: 0.7, execution: 0.5 },
        'Developer': { concept: 0.5, execution: 0.9 },
        'Illustrator': { concept: 0.6, execution: 0.8 },
        'Musician': { concept: 0.7, execution: 0.9 },
        'Producer': { concept: 0.6, execution: 0.7 }
      };
      
      // Calculate estimated contribution scores based on roles
      const contributorsWithEstimates = contributors.map(contributor => {
        const roleEstimate = roleEstimates[contributor.role] || { concept: 0.5, execution: 0.5 };
        
        // Use contributor's actual values if available, otherwise estimate
        const conceptScore = contributor.conceptCredit || (roleEstimate.concept * 100);
        const executionScore = contributor.contributions || (roleEstimate.execution * 100);
        
        // Apply project type weights
        const weightedScore = 
          (conceptScore * weights.concept) + 
          (executionScore * weights.execution);
        
        return {
          ...contributor,
          estimatedConceptScore: conceptScore,
          estimatedExecutionScore: executionScore,
          estimatedWeightedScore: weightedScore
        };
      });
      
      // Calculate total weighted score
      const totalWeightedScore = contributorsWithEstimates.reduce(
        (sum, c) => sum + c.estimatedWeightedScore, 
        0
      );
      
      // Calculate percentage allocations
      const recommendedAllocation = contributorsWithEstimates.map(contributor => ({
        ...contributor,
        recommendedPercentage: totalWeightedScore > 0 
          ? (contributor.estimatedWeightedScore / totalWeightedScore) * 100 
          : 0
      }))
      .sort((a, b) => b.recommendedPercentage - a.recommendedPercentage);
      
      return {
        projectType,
        typeWeights: weights,
        recommendations: recommendedAllocation
      };
    }
  };
  
  export default IPRightsUtils;