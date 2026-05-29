import * as nvidiaH200 from './nvidia-h200.mjs';
import * as nvidiaB200 from './nvidia-b200.mjs';
import * as amdMi325x from './amd-mi325x.mjs';
import * as amdMi350x from './amd-mi350x.mjs';
import * as intelGaudi3 from './intel-gaudi-3.mjs';
import * as intelFalconShores from './intel-falcon-shores.mjs';
import * as awsTrainium2 from './aws-trainium-2.mjs';
import * as awsTrainium3 from './aws-trainium-3.mjs';
import * as awsInferentia2 from './aws-inferentia-2.mjs';
import * as microsoftMaia100 from './microsoft-maia-100.mjs';
import * as microsoftMaia200 from './microsoft-maia-200.mjs';
import * as googleTpuV5p from './google-tpu-v5p.mjs';
import * as googleTpuV6 from './google-tpu-v6.mjs';
import * as huaweiAscend910c from './huawei-ascend-910c.mjs';
import * as metaMtiaV2 from './meta-mtia-v2.mjs';
import * as baiduKunlun2 from './baidu-kunlun-2.mjs';
import * as sambanovaSn40 from './sambanova-sn40.mjs';
import * as tenstorrentBlackhole from './tenstorrent-blackhole.mjs';
import * as groqLpu from './groq-lpu.mjs';
import * as cerebrasWse3 from './cerebras-wse-3.mjs';

/** @type {Record<string, typeof nvidiaH200>} */
export const TOPIC_MODULES = {
  'nvidia-h200': nvidiaH200,
  'nvidia-b200': nvidiaB200,
  'amd-mi325x': amdMi325x,
  'amd-mi350x': amdMi350x,
  'intel-gaudi-3': intelGaudi3,
  'intel-falcon-shores': intelFalconShores,
  'aws-trainium-2': awsTrainium2,
  'aws-trainium-3': awsTrainium3,
  'aws-inferentia-2': awsInferentia2,
  'microsoft-maia-100': microsoftMaia100,
  'microsoft-maia-200': microsoftMaia200,
  'google-tpu-v5p': googleTpuV5p,
  'google-tpu-v6': googleTpuV6,
  'huawei-ascend-910c': huaweiAscend910c,
  'meta-mtia-v2': metaMtiaV2,
  'baidu-kunlun-2': baiduKunlun2,
  'sambanova-sn40': sambanovaSn40,
  'tenstorrent-blackhole': tenstorrentBlackhole,
  'groq-lpu': groqLpu,
  'cerebras-wse-3': cerebrasWse3,
};

export function getTopicModule(topicId) {
  const mod = TOPIC_MODULES[topicId];
  if (!mod) throw new Error(`No topic module for ${topicId}`);
  return mod;
}
