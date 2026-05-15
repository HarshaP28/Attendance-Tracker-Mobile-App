  // ✅ FIXED: Removed manual Content-Type header — React Native sets it automatically
  // with the correct multipart boundary. Setting it manually breaks the upload.
  const uploadImageForAttendance = async (uri: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      formData.append('photo', {
        uri: uri,           // React Native handles file:// correctly on Android
        name: `attendance_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      const response = await fetch(`${BASE_URL}/api/upload-attendance`, {
        method: 'POST',
        body: formData,
        // ❌ REMOVED: 'Content-Type': 'multipart/form-data'
        // React Native automatically adds the correct Content-Type with boundary
        headers: {
          'Accept': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert("✅ Attendance Marked", result.message);
        setCameraVisible(false);
      } else {
        Alert.alert("Recognition Failed", result.message || "Face not recognized in database.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Server Error", "Could not connect to the recognition service.");
    } finally {
      setLoading(false);
    }
  };
