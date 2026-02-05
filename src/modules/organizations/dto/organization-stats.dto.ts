export interface OrganizationStatsDto {
  totalMembers: number;
  totalDeals: number;
  totalLeads: number;
  totalContacts: number;
  totalPipelines: number;
  limits: {
    maxUsers: number;
    maxDeals: number;
    maxPipelines: number;
    maxContacts: number;
    maxAutomations: number;
  };
  usage: {
    usersPercentage: number;
    dealsPercentage: number;
    pipelinesPercentage: number;
    contactsPercentage: number;
    automationsPercentage: number;
  };
}
