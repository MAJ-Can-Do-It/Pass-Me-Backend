import { db } from './config/firebase.js';

async function unblockAllStudents() {
  try {
    console.log('Starting to unblock all students...');

    const snapshot = await db.collection('students').get();
    let count = 0;

    for (const doc of snapshot.docs) {
      const student = doc.data();

      if (student.accountStatus === 'blocked') {
        await db.collection('students').doc(doc.id).update({
          accountStatus: 'active',
          unblockedAt: new Date()
        });
        count++;
        console.log(`✓ Unblocked: ${student.fullName || student.email}`);
      }
    }

    console.log(`\n✅ Total unblocked: ${count} students`);
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

unblockAllStudents();
