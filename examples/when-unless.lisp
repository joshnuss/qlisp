(defun check-positive (n)
  (when (> n 0)
    (print "checking...")
    (print n)))

(check-positive 5)
(check-positive -5)

(defun check-nonzero (n)
  (unless (= n 0)
    (print "checking...")
    (print n)))

(check-nonzero 5)
(check-nonzero 0)
