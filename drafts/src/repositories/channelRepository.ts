import type { AIChannelEntity, AbilityMappingEntity, AIAbilityKey } from "../types/index";

export interface ChannelRepository {
  insert(channel: AIChannelEntity): Promise<void>;
  update(id: string, patch: Partial<AIChannelEntity>): Promise<AIChannelEntity>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<AIChannelEntity | null>;
  list(): Promise<AIChannelEntity[]>;
  listEnabled(): Promise<AIChannelEntity[]>;
  setAbilityMapping(mapping: AbilityMappingEntity): Promise<void>;
  clearAbilityMapping(abilityKey: AIAbilityKey): Promise<void>;
  listAbilityMappings(): Promise<AbilityMappingEntity[]>;
  findChannelIdForAbility(abilityKey: AIAbilityKey): Promise<string | null>;
}
