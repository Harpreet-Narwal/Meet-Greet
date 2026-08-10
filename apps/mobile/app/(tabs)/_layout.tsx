import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

/**
 * The tab bar is a real UITabBar, not a row of Views pretending to be one.
 *
 * This is the single change that does most of the work in making the app stop
 * feeling like a website. A JS tab bar gets the blur wrong, the safe-area
 * inset wrong, and misses the behaviours people never consciously notice until
 * they are absent: tapping the active tab scrolls its screen to top, switching
 * tabs preserves each stack's position, and the bar adapts on iPad and in
 * landscape. NativeTabs hands all of that to the platform.
 *
 * Three tabs, well under the five iOS allows before a "More" tab is forced —
 * browse, talk, and your own stuff is the whole app.
 *
 * Icons are SF Symbols, so they match the weight of system chrome and shift
 * correctly between filled and outline for the selected state.
 */
export default function TabsLayout() {
  return (
    <NativeTabs
      // Hide-on-scroll, done by UIKit rather than by us listening to scroll
      // offsets: the bar shrinks away as you read down a list and springs back
      // the moment you scroll up. Handing this to the platform is what makes it
      // track the scroll rubber-banding correctly instead of stuttering.
      //
      // iOS 26+. Older versions ignore it and keep a static bar, which is the
      // correct fallback rather than a JS reimplementation that would feel
      // wrong on both.
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <Label>Tables</Label>
        <Icon sf={{ default: "fork.knife", selected: "fork.knife" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chats">
        <Label>Chats</Label>
        <Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="you">
        <Label>You</Label>
        <Icon sf={{ default: "person", selected: "person.fill" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
