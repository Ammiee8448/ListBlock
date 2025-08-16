;; sanctions-registry.clar
;; A comprehensive sanctions and watchlist registry for financial compliance
;; Enables multi-party governance for managing sanctioned addresses with automatic expiration

;; ===== CONSTANTS =====

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_ALREADY_SANCTIONED (err u101))
(define-constant ERR_NOT_SANCTIONED (err u102))
(define-constant ERR_INVALID_EXPIRATION (err u103))
(define-constant ERR_ALREADY_AUTHORITY (err u104))
(define-constant ERR_NOT_AUTHORITY (err u105))
(define-constant ERR_CANNOT_REMOVE_OWNER (err u106))
(define-constant ERR_INVALID_REASON (err u107))

;; Maximum length for sanction reasons
(define-constant MAX_REASON_LENGTH u200)

;; ===== DATA STRUCTURES =====

;; Sanction entry structure
(define-map sanctions 
  { address: principal }
  {
    reason: (string-ascii 200),
    expiration-block: uint,
    issuing-authority: principal,
    created-at: uint
  }
)

;; Authorized authorities who can manage sanctions
(define-map authorities 
  { authority: principal }
  { 
    active: bool,
    added-by: principal,
    added-at: uint
  }
)

;; Track total sanctions for analytics
(define-data-var total-sanctions uint u0)

;; Track total authorities
(define-data-var total-authorities uint u1)

;; ===== PRIVATE FUNCTIONS =====

;; Check if a principal is an active authority
(define-private (is-authority (user principal))
  (default-to false (get active (map-get? authorities { authority: user })))
)

;; Check if a sanction has expired
(define-private (is-expired (expiration-block uint))
  (> stacks-block-height expiration-block)
)

;; Validate reason string
(define-private (is-valid-reason (reason (string-ascii 200)))
  (and 
    (> (len reason) u0)
    (<= (len reason) MAX_REASON_LENGTH)
  )
)

;; ===== INITIALIZATION =====

;; Initialize contract owner as first authority
(map-set authorities 
  { authority: CONTRACT_OWNER }
  { 
    active: true,
    added-by: CONTRACT_OWNER,
    added-at: stacks-block-height
  }
)

;; ===== PUBLIC FUNCTIONS =====

;; Add a new authority (only existing authorities can do this)
(define-public (add-authority (new-authority principal))
  (begin
    (asserts! (is-authority tx-sender) ERR_NOT_AUTHORIZED)
    (asserts! (not (is-authority new-authority)) ERR_ALREADY_AUTHORITY)
    
    (map-set authorities
      { authority: new-authority }
      {
        active: true,
        added-by: tx-sender,
        added-at: stacks-block-height
      }
    )
    
    (var-set total-authorities (+ (var-get total-authorities) u1))
    (ok true)
  )
)

;; Remove an authority (only contract owner or the authority themselves)
(define-public (remove-authority (authority-to-remove principal))
  (begin
    (asserts! 
      (or 
        (is-eq tx-sender CONTRACT_OWNER)
        (is-eq tx-sender authority-to-remove)
      ) 
      ERR_NOT_AUTHORIZED
    )
    (asserts! (not (is-eq authority-to-remove CONTRACT_OWNER)) ERR_CANNOT_REMOVE_OWNER)
    (asserts! (is-authority authority-to-remove) ERR_NOT_AUTHORITY)
    
    (map-set authorities
      { authority: authority-to-remove }
      {
        active: false,
        added-by: (default-to CONTRACT_OWNER (get added-by (map-get? authorities { authority: authority-to-remove }))),
        added-at: (default-to stacks-block-height (get added-at (map-get? authorities { authority: authority-to-remove })))
      }
    )
    
    (var-set total-authorities (- (var-get total-authorities) u1))
    (ok true)
  )
)

;; Add a sanction to an address
(define-public (add-sanction 
  (target principal) 
  (reason (string-ascii 200)) 
  (expiration-block uint)
)
  (begin
    (asserts! (is-authority tx-sender) ERR_NOT_AUTHORIZED)
    (asserts! (is-valid-reason reason) ERR_INVALID_REASON)
    (asserts! (> expiration-block stacks-block-height) ERR_INVALID_EXPIRATION)
    (asserts! (is-none (map-get? sanctions { address: target })) ERR_ALREADY_SANCTIONED)
    
    (map-set sanctions
      { address: target }
      {
        reason: reason,
        expiration-block: expiration-block,
        issuing-authority: tx-sender,
        created-at: stacks-block-height
      }
    )
    
    (var-set total-sanctions (+ (var-get total-sanctions) u1))
    (ok true)
  )
)

;; Remove a sanction (only the issuing authority or contract owner)
(define-public (remove-sanction (target principal))
  (let (
    (sanction-data (unwrap! (map-get? sanctions { address: target }) ERR_NOT_SANCTIONED))
    (issuing-authority (get issuing-authority sanction-data))
  )
    (begin
      (asserts! 
        (or 
          (is-eq tx-sender issuing-authority)
          (is-eq tx-sender CONTRACT_OWNER)
        ) 
        ERR_NOT_AUTHORIZED
      )
      
      (map-delete sanctions { address: target })
      (var-set total-sanctions (- (var-get total-sanctions) u1))
      (ok true)
    )
  )
)

;; Update sanction reason and/or expiration
(define-public (update-sanction 
  (target principal) 
  (new-reason (string-ascii 200)) 
  (new-expiration-block uint)
)
  (let (
    (sanction-data (unwrap! (map-get? sanctions { address: target }) ERR_NOT_SANCTIONED))
    (issuing-authority (get issuing-authority sanction-data))
  )
    (begin
      (asserts! 
        (or 
          (is-eq tx-sender issuing-authority)
          (is-eq tx-sender CONTRACT_OWNER)
        ) 
        ERR_NOT_AUTHORIZED
      )
      (asserts! (is-valid-reason new-reason) ERR_INVALID_REASON)
      (asserts! (> new-expiration-block stacks-block-height) ERR_INVALID_EXPIRATION)
      
      (map-set sanctions
        { address: target }
        {
          reason: new-reason,
          expiration-block: new-expiration-block,
          issuing-authority: issuing-authority,
          created-at: (get created-at sanction-data)
        }
      )
      (ok true)
    )
  )
)

;; ===== READ-ONLY FUNCTIONS =====

;; Check if an address is currently sanctioned (and not expired)
(define-read-only (is-sanctioned (address principal))
  (match (map-get? sanctions { address: address })
    sanction-data (not (is-expired (get expiration-block sanction-data)))
    false
  )
)

;; Get sanction details for an address
(define-read-only (get-sanction-details (address principal))
  (map-get? sanctions { address: address })
)

;; Check if address is sanctioned and return details
(define-read-only (get-sanction-status (address principal))
  (match (map-get? sanctions { address: address })
    sanction-data 
    {
      sanctioned: (not (is-expired (get expiration-block sanction-data))),
      details: (some sanction-data)
    }
    {
      sanctioned: false,
      details: none
    }
  )
)

;; Get authority details
(define-read-only (get-authority-details (authority principal))
  (map-get? authorities { authority: authority })
)

;; Check if principal is an active authority
(define-read-only (is-active-authority (authority principal))
  (is-authority authority)
)

;; Get contract statistics
(define-read-only (get-contract-stats)
  {
    total-sanctions: (var-get total-sanctions),
    total-authorities: (var-get total-authorities),
    current-block: stacks-block-height,
    contract-owner: CONTRACT_OWNER
  }
)

;; Batch check multiple addresses
(define-read-only (batch-check-sanctions (addresses (list 50 principal)))
  (map is-sanctioned addresses)
)
