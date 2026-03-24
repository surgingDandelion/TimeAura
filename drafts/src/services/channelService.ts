import type { AbilityMappingEntity, AIAbilityKey, AIChannelEntity, ChannelTestResult, CreateChannelInput, UpdateChannelPatch } from "../types/index";

export interface ChannelService {
  listChannels(): Promise<AIChannelEntity[]>;
  listEnabledChannels(): Promise<AIChannelEntity[]>;
  getChannelById(id: string): Promise<AIChannelEntity | null>;
  createChannel(input: CreateChannelInput): Promise<AIChannelEntity>;
  updateChannel(id: string, patch: UpdateChannelPatch): Promise<AIChannelEntity>;
  deleteChannel(id: string): Promise<void>;
  toggleChannel(id: string, enabled: boolean): Promise<AIChannelEntity>;
  testChannel(id: string): Promise<ChannelTestResult>;
  listAbilityMappings(): Promise<AbilityMappingEntity[]>;
  setAbilityChannel(abilityKey: AIAbilityKey, channelId: string): Promise<void>;
}
