import type {
	AnimationInterpolation,
	AnimationPath,
	AnimationValue,
	CurveHandle,
	ScalarAnimationChannel,
	ScalarAnimationKey,
	ScalarSegmentType,
	TangentMode,
} from "@/model/decorations/animations";

export type {
	AnimationBindingByKind,
	AnimationBindingComponent,
	AnimationBindingInstance,
	AnimationBindingKind,
	AnimationBindingOfKind,
	AnimationChannel,
	AnimationColorPropertyPath,
	AnimationInterpolation,
	AnimationKeyframe,
	AnimationNumericPropertyPath,
	AnimationPath,
	AnimationPropertyGroup,
	AnimationPropertyPath,
	AnimationPropertyValueMap,
	AnimationValue,
	AnimationValueForPath,
	ChannelExtrapolationMode,
	ColorAnimationBinding,
	ContinuousKeyframeInterpolation,
	CurveHandle,
	DiscreteAnimationBinding,
	DiscreteAnimationChannel,
	DiscreteAnimationKey,
	DiscreteKeyframeInterpolation,
	DiscreteValue,
	DynamicAnimationPathValue,
	EffectParamPath,
	ElementAnimationBindingMap,
	ElementAnimationChannelMap,
	ElementAnimations,
	GraphicParamPath,
	NormalizedCubicBezier,
	NumberAnimationBinding,
	NumericSpec,
	PrimitiveAnimationChannelKind,
	ScalarAnimationChannel,
	ScalarAnimationKey,
	ScalarSegmentType,
	TangentMode,
	Vector2AnimationBinding,
	VectorValue,
} from "@/model/decorations/animations";

export {
	ANIMATION_PROPERTY_GROUPS,
	ANIMATION_PROPERTY_PATHS,
} from "@/model/decorations/animations";

export interface ScalarGraphChannelTarget {
	propertyPath: AnimationPath;
	componentKey: string;
	channelId: string;
}

export interface ScalarGraphChannel extends ScalarGraphChannelTarget {
	channel: ScalarAnimationChannel;
}

export interface ScalarGraphKeyframeRef extends ScalarGraphChannelTarget {
	keyframeId: string;
}

export interface ScalarGraphKeyframeContext extends ScalarGraphChannel {
	keyframe: ScalarAnimationKey;
	keyframeIndex: number;
	previousKey: ScalarAnimationKey | null;
	nextKey: ScalarAnimationKey | null;
}

export interface ScalarCurveKeyframePatch {
	leftHandle?: CurveHandle | null;
	rightHandle?: CurveHandle | null;
	segmentToNext?: ScalarSegmentType;
	tangentMode?: TangentMode;
}

export interface ElementKeyframe {
	propertyPath: AnimationPath;
	id: string;
	time: number;
	value: AnimationValue;
	interpolation: AnimationInterpolation;
}

export interface SelectedKeyframeRef {
	trackId: string;
	elementId: string;
	propertyPath: AnimationPath;
	keyframeId: string;
}
