# Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership**: Every document in `/users/{userId}` and its subcollections (`private`, `exercises`, `routines`, `workouts`, `measurements`, `progressReports`) belongs exclusively to `userId == request.auth.uid` and requires `ownerId == request.auth.uid`.
2. **Verified Identity**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation**: User email and display name live only in `/users/{userId}/private/info` and cannot be read or listed by any other user.
4. **Master Gate Integrity**: Subcollection writes require that the parent `/users/{userId}` document exists and its `ownerId == request.auth.uid`.
5. **Strict Key & Bounds Validation**: No shadow fields are permitted (`hasOnly`), strings have bounded `.size()`, arrays are capped at `<= 30` items, and document IDs match `^[a-zA-Z0-9_\\-]+$` with length `<= 128`.
6. **Temporal Integrity & Immutability**: `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on create and update; `ownerId` is immutable.

## 2. The "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. **Cross-user read**: User B attempts `get` on `/users/userA/workouts/w1`.
2. **Cross-user list**: User B attempts `list` on `/users/userA/measurements`.
3. **Identity spoofing**: User A attempts `create` on `/users/userA/workouts/w1` with `ownerId: "userB"`.
4. **Unverified email write**: User with `email_verified: false` attempts `create` on `/users/userA/exercises/ex1`.
5. **Shadow field injection**: User A sends `isAdmin: true` or `shadowField: 123` on `create` or `update` to `/users/userA`.
6. **Document ID poisoning**: User A attempts `create` on `/users/userA/routines/${'a'.repeat(200)}` or ID containing spaces/symbols.
7. **Server timestamp forgery**: User A sends a backdated `createdAt` or `updatedAt` != `request.time`.
8. **Immutable field tampering**: User A attempts `update` changing `createdAt` or `ownerId` on `/users/userA/workouts/w1`.
9. **String resource exhaustion**: User A sends a 10KB `notes` string (`> 800` chars) in `WorkoutSession`.
10. **Array flooding**: User A sends 31 exercises in `WorkoutRoutine.exercises` (`> 30`).
11. **Invalid enum / range poisoning**: User A sends `weightKg: 9999` or `goal: "invalid_goal"` or malformed `recordedDate: "2026/11/16"`.
12. **Orphaned subcollection write**: User A attempts `create` on `/users/userA/workouts/w1` before parent `/users/userA` exists.
