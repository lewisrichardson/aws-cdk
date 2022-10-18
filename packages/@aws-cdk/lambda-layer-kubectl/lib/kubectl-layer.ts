import { KubectlAsset } from '@aws-cdk/asset-kubectl-v20';
import * as lambda from '@aws-cdk/aws-lambda';
import { ILambdaLayerAsset } from '@aws-cdk/interfaces';
import { Construct } from 'constructs';

/**
 * KubectlLayer construct props
 */
 export interface KubectlLayerProps {
  /**
   * Use this property to supply your desired version of kubectl
   *
   * @default - An asset containing kubectl v1.20 will be used.
   */
  readonly kubectlAsset?: ILambdaLayerAsset;
}

/**
 * An AWS Lambda layer that includes `kubectl` and `helm`.
 */
export class KubectlLayer extends lambda.LayerVersion {
  constructor(scope: Construct, id: string, props: KubectlLayerProps = {}) {
    super(scope, id, {
      code: props.kubectlAsset ? lambda.Code.fromLambdaLayerAsset(props.kubectlAsset) : lambda.Code.fromLambdaLayerAsset(new KubectlAsset(scope, `${id}-Default-Kubectl`))
    });
  }
}