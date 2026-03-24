import type { AbilityMappingEntity, AIAbilityKey, AIChannelEntity, ChannelTestResult, CreateChannelInput, UpdateChannelPatch } from "../types/index";

export interface ChannelService {
  listChannels(): Promise<AIChannelEntity[]>;
  listEnabledChannels(): Promise<AIChannelEntity[]>;
  getChannelById(id: string): Promise<AIChannelEntity | null>;
  hasChannelSecret(id: string): Promise<boolean>;
  createChannel(input: CreateChannelInput): Promise<AIChannelEntity>;
  updateChannel(id: string, patch: UpdateChannelPatch): Promise<AIChannelEntity>;
  deleteChannel(id: string): Promise<void>;
  toggleChannel(id: string, enabled: boolean): Promise<AIChannelEntity>;
  setChannelApiKey(id: string, apiKey: string): Promise<AIChannelEntity>;
  clearChannelApiKey(id: string): Promise<AIChannelEntity>;
  testChannel(id: string): Promise<ChannelTestResult>;
  listAbilityMappings(): Promise<AbilityMappingEntity[]>;
  setAbilityChannel(abilityKey: AIAbilityKey, channelId: string): Promise<void>;
  clearAbilityChannel(abilityKey: AIAbilityKey): Promise<void>;
}
