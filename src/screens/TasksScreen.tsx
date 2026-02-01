import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';

// Modern color palette inspired by Apple/Microsoft design
const Colors = {
  background: '#FFFFFF', // Pure white background
  surface: '#FFFFFF',
  primary: '#007AFF', // iOS blue
  success: '#34C759', // iOS green
  danger: '#FF3B30', // iOS red
  text: '#000000',
  textSecondary: '#8E8E93', // iOS gray
  textTertiary: '#C7C7CC', // iOS gray3
  separator: '#E5E5EA', // iOS gray5
  overlay: 'rgba(0, 0, 0, 0.05)',
};

// Checkbox component with animation
function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  }, [onPress, scaleAnim]);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Modern Task Item with clean design
function TaskItem({
  task,
  onToggle,
  onDelete,
  isLast,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isLast: boolean;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(task.id);
    }, 200);
  }, [onDelete, task.id]);

  return (
    <View style={[styles.taskItem, isLast && styles.taskItemLast]}>
      <View style={styles.taskRow}>
        <Checkbox checked={task.completed} onPress={() => onToggle(task.id)} />
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
            {task.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            {task.description && !task.completed && (
              <Text style={styles.taskDescription}>{task.description}</Text>
            )}
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorBadgeText}>
                {task.created_by.slice(0, 4)}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.deleteButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.deleteIcon}>
            <Text style={styles.deleteIconText}>−</Text>
          </View>
        </TouchableOpacity>
      </View>
      {!isLast && <View style={styles.separator} />}
    </View>
  );
}

// Sync Button Component
function SyncButton({
  title,
  onPress,
  isLoading,
}: {
  title: string;
  onPress: () => void;
  isLoading: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.syncButton, isLoading && styles.syncButtonDisabled]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <Text style={styles.syncButtonText}>{isLoading ? '...' : title}</Text>
    </TouchableOpacity>
  );
}

export function TasksScreen() {
  const { tasks, isLoading, isSyncing, createTask, toggleTask, deleteTask, pull, push } = useTasks();
  const { signOut, user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const inputRef = React.useRef<TextInput>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await pull();
    setIsRefreshing(false);
  };

  const handlePull = async () => {
    setIsPulling(true);
    try {
      await pull();
    } finally {
      setIsPulling(false);
    }
  };

  const handlePush = async () => {
    setIsPushing(true);
    try {
      await push();
    } finally {
      setIsPushing(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await createTask({ title: newTaskTitle.trim() });
      setNewTaskTitle('');
      inputRef.current?.blur();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>Tasks</Text>
            <Text style={styles.headerDate}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={signOut} activeOpacity={0.7}>
            <Text style={styles.profileText}>{user?.email?.charAt(0).toUpperCase() || 'U'}</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Indicator */}
        {totalCount > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(completedCount / totalCount) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {completedCount} of {totalCount} completed
            </Text>
          </View>
        )}
      </View>

      {/* Modern Input Section */}
      <View style={styles.inputSection}>
        <View style={styles.inputContainer}>
          <View style={styles.inputIcon}>
            <Text style={styles.inputIconText}>+</Text>
          </View>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Add a new task..."
            placeholderTextColor={Colors.textTertiary}
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            onSubmitEditing={handleCreateTask}
            returnKeyType="done"
          />
          {newTaskTitle.length > 0 && (
            <TouchableOpacity style={styles.inputButton} onPress={handleCreateTask} activeOpacity={0.7}>
              <Text style={styles.inputButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Task List */}
      <FlatList
        data={tasks.filter((task) => task?.id)}
        keyExtractor={(item) => item.id || `task-${Math.random()}`}
        renderItem={({ item, index }) => (
          <TaskItem
            task={item}
            onToggle={toggleTask}
            onDelete={deleteTask}
            isLast={index === tasks.length - 1}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>✓</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {isLoading ? 'Loading tasks...' : 'All caught up!'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isLoading ? '' : 'Add a task to get started'}
            </Text>
          </View>
        }
      />

      {/* Bottom Sync Bar */}
      <View style={styles.syncBar}>
        <View style={styles.syncButtons}>
          <SyncButton title="Pull" onPress={handlePull} isLoading={isPulling} />
          <View style={styles.syncDivider} />
          <SyncButton title="Push" onPress={handlePush} isLoading={isPushing} />
        </View>
        <Text style={styles.syncStatus}>
          {isPulling || isPushing ? 'Syncing...' : 'Synced'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Header Styles
  header: {
    backgroundColor: Colors.surface,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerGreeting: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '400',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  // Progress Styles
  progressContainer: {
    marginTop: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.separator,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  // Input Styles
  inputSection: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  inputIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inputIconText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: '300',
    lineHeight: 22,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 17,
    color: Colors.text,
    fontWeight: '400',
  },
  inputButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  inputButtonText: {
    color: Colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  // List Styles
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  // Task Item Styles
  taskItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  taskItemLast: {
    marginBottom: 0,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 17,
    color: Colors.text,
    fontWeight: '400',
    lineHeight: 22,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.separator,
    marginLeft: 52,
  },
  deleteButton: {
    padding: 4,
  },
  deleteIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconText: {
    color: Colors.danger,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
  // Empty State Styles
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 40,
    color: Colors.success,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  // Sync Bar Styles
  syncBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  syncDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.separator,
    marginHorizontal: 8,
  },
  syncStatus: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  creatorBadge: {
    marginLeft: 'auto',
    backgroundColor: Colors.overlay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creatorBadgeText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
