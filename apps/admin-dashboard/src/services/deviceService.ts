import { trpc } from "@/lib/trpc";

export const deviceService = {
  provisionDevice: async (hardwareSerial: string): Promise<any> => {
    return trpc.device.provision.mutate({ hardwareSerial });
  },

  bindDevice: async (deviceId: string, tenantId: string): Promise<any> => {
    return trpc.device.bind.mutate({ deviceId, tenantId });
  },

  decommissionDevice: async (deviceId: string): Promise<any> => {
    return trpc.device.decommission.mutate({ deviceId });
  },

  replaceHardware: async (oldDeviceId: string, newHardwareSerial: string): Promise<any> => {
    return trpc.device.replace.mutate({ oldDeviceId, newHardwareSerial });
  },

  editHardwareSerial: async (deviceId: string, newHardwareSerial: string): Promise<any> => {
    return trpc.device.editSerial.mutate({ deviceId, newHardwareSerial });
  },
};
